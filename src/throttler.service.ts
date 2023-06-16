import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Cluster, Redis, RedisOptions } from 'ioredis';
import { FindOneAndUpdateOptions, MongoClient, MongoClientOptions } from 'mongodb';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

@Injectable()
export class ThrottlerStorageMemoryService implements ThrottlerStorage {
  private _storage: Record<string, ThrottlerStorageRecord>;

  get storage(): Record<string, ThrottlerStorageRecord> {
    return this._storage;
  }

  constructor() {
    this._storage = {}; // Initialize the in-memory storage
  }
  async increment(key: string, ttlMilliseconds: number): Promise<ThrottlerStorageRecord> {
    if (!this._storage[key]) {
      this._storage[key] = { totalHits: 0, timeToExpire: Date.now() + ttlMilliseconds };
    }

    let timeToExpire = this.getExpirationTime(key);

    // Reset the timeToExpire once it has expired.
    if (timeToExpire <= 0) {
      this._storage[key].timeToExpire = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    this._storage[key].totalHits++;

    return {
      totalHits: this._storage[key].totalHits,
      timeToExpire: this.getExpirationTime(key),
    };
  }

  /**
   * Calculates the remaining time to expiration for a given key in seconds.
   * @param key The key for which to calculate the remaining time to expiration.
   * @returns The remaining time to expiration in seconds.
   */
  private getExpirationTime(key: string): number {
    return Math.floor((this.storage[key].timeToExpire - Date.now()) / 1000);
  }
}
@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage, OnApplicationShutdown {
  private redisClient: Redis | Cluster;
  private _storage: Record<string, ThrottlerStorageRecord>;

  get storage(): Record<string, ThrottlerStorageRecord> {
    return this._storage;
  }

  constructor(redisOrOptions?: Redis | Cluster | RedisOptions | string) {
    if (redisOrOptions instanceof Redis || redisOrOptions instanceof Cluster) {
      this.redisClient = redisOrOptions;
    } else if (typeof redisOrOptions === 'string') {
      this.redisClient = new Redis(redisOrOptions as string);
    } else {
      this.redisClient = new Redis(redisOrOptions as RedisOptions);
    }

    this._storage = {}; // Initialize the storage (e.g., empty object)
  }
  async increment(key: string, ttlMilliseconds: number): Promise<ThrottlerStorageRecord> {
    // Update the Redis record if the respective storage type is selected
    const totalHits = await this.redisClient.incr(key);
    await this.redisClient.expire(key, ttlMilliseconds / 1000);
    return {
      totalHits,
      timeToExpire: ttlMilliseconds / 1000,
    };
  }

  async onApplicationShutdown() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}
@Injectable()
export class ThrottlerStorageMongoService implements ThrottlerStorage, OnApplicationShutdown {
  private mongoClient: MongoClient;
  private _storage: Record<string, ThrottlerStorageRecord>;
  get storage(): Record<string, ThrottlerStorageRecord> {
    return this._storage;
  }

  constructor(url: string, mongoOptions?: MongoClientOptions) {
    this._storage = {}; // Initialize the storage (e.g., empty object)
    this.mongoClient = new MongoClient(url, mongoOptions);

    (async () => {
      try {
        await this.mongoClient.connect();
        await this.createTTLIndex();
      } catch (error) {
        console.error('Error connecting to MongoDB:', error);
      }
    })();
  }

  /**
   * Creates a TTL index on the `expireAt` field in the MongoDB collection.
   */
  private async createTTLIndex(): Promise<void> {
    await this.mongoClient
      .db()
      .collection('throttler')
      .createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
  }

  /**
   * Increments the request count for the specified key
   * and updates the TTL (time to live) for the key's expiration.
   * @param key The key for which to increment the request count.
   * @param ttlMilliseconds The TTL value in milliseconds for the key's expiration.
   * @returns The updated request count and time to expiration.
   */
  async increment(key: string, ttlMilliseconds: number): Promise<ThrottlerStorageRecord> {
    // Update the Redis or MongoDB record if the respective storage type is selected

    const result = await this.mongoClient
      .db()
      .collection('throttler')
      .findOneAndUpdate(
        { key },
        {
          $inc: { totalHits: 1 },
          $set: { expireAt: new Date(Date.now() + ttlMilliseconds) },
        },
        {
          upsert: true,
          returnDocument: 'after',
        } as FindOneAndUpdateOptions,
      );
    const { totalHits, expireAt } = result.value;
    const timeToExpire = Math.max(0, Math.floor((expireAt.getTime() - Date.now()) / 1000));

    return {
      totalHits,
      timeToExpire,
    };
  }

  /**
   * Cleans up the resources when the application shuts down.
   */
  async onApplicationShutdown() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}
