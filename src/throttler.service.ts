import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private _storage: Record<string, ThrottlerStorageOptions> = {};
  private timeoutIds: NodeJS.Timeout[] = [];

  get storage(): Record<string, ThrottlerStorageOptions> {
    return this._storage;
  }

  /**
   * Get the expiration time in seconds from a single record.
   */
  private getExpirationTime(key: string): number {
    return Math.floor((this.storage[key].expiresAt - Date.now()) / 1000);
  }

  /**
   * Set the expiration time for a given key.
   */
  private setExpirationTime(key: string, ttlMilliseconds: number): void {
    const timeoutId = setTimeout(() => {
      this.storage[key].totalHits--;
      console.log(this.storage[key].totalHits, key)
      clearTimeout(timeoutId);
      this.timeoutIds = this.timeoutIds.filter((id) => id != timeoutId);
    }, ttlMilliseconds);
    this.timeoutIds.push(timeoutId);
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const ttlMilliseconds = ttl;
    if (!this.storage[key]) {
      this.storage[key] = { totalHits: 0, expiresAt: Date.now() + ttlMilliseconds };
    }

    // Reset the timeToExpire once it has been expired.
    this.storage[key].expiresAt = Date.now() + ttlMilliseconds;
    const timeToExpire = this.getExpirationTime(key);

    this.storage[key].totalHits++;
    this.setExpirationTime(key, ttlMilliseconds);

    console.log(this.storage[key], new Date(this.storage[key].expiresAt), key)

    return {
      totalHits: this.storage[key].totalHits,
      timeToExpire,
    };
  }

  onApplicationShutdown() {
    this.timeoutIds.forEach(clearTimeout);
  }
}
