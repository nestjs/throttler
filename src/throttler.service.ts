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
      clearTimeout(timeoutId);
      this.timeoutIds = this.timeoutIds.filter((id) => id != timeoutId);
    }, ttlMilliseconds);
    this.timeoutIds.push(timeoutId);
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const ttlMilliseconds = ttl * 1000;
    if (!this.storage[key]) {
      this.storage[key] = { totalHits: 0, expiresAt: Date.now() + ttlMilliseconds };
    }

    let timeToExpire = this.getExpirationTime(key);

    // Reset the timeToExpire once it has been expired.
    if (timeToExpire <= 0) {
      this.storage[key].expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    this.storage[key].totalHits++;
    this.setExpirationTime(key, ttlMilliseconds);

    return {
      totalHits: this.storage[key].totalHits,
      timeToExpire,
    };
  }

  onApplicationShutdown() {
    this.timeoutIds.forEach(clearTimeout);
  }
}
