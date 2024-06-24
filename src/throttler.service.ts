import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private _map: Map<string, ThrottlerStorageOptions> = new Map();
  private timeoutIds: NodeJS.Timeout[] = [];

  get storage(): Record<string, ThrottlerStorageOptions> {
    return Object.fromEntries(this.map);
    // If need to increase performance with loss of access to Map data.
    // Detailed behavior: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#setting_object_properties
    // return this._map as unknown as Record<string, ThrottlerStorageOptions>;
  }

  private get map(): Map<string, ThrottlerStorageOptions> {
    return this._map;
  }

  /**
   * Get the expiration time in seconds from a single record.
   */
  private getExpirationTime(key: string): number {
    return Math.floor((this.map.get(key).expiresAt - Date.now()) / 1000);
  }

  /**
   * Set the expiration time for a given key.
   */
  private setExpirationTime(key: string, ttlMilliseconds: number): void {
    const timeoutId = setTimeout(() => {
      this.map.get(key).totalHits--;
      clearTimeout(timeoutId);
      this.timeoutIds = this.timeoutIds.filter((id) => id != timeoutId);
    }, ttlMilliseconds);
    this.timeoutIds.push(timeoutId);
  }

  async increment(key: string, ttl: number): Promise<ThrottlerStorageRecord> {
    const ttlMilliseconds = ttl;
    if (!this.map.has(key)) {
      this.map.set(key, { totalHits: 0, expiresAt: Date.now() + ttlMilliseconds });
    }

    let timeToExpire = this.getExpirationTime(key);

    // Reset the timeToExpire once it has been expired.
    if (timeToExpire <= 0) {
      this.map.get(key).expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    this.map.get(key).totalHits++;
    this.setExpirationTime(key, ttlMilliseconds);

    return {
      totalHits: this.map.get(key).totalHits,
      timeToExpire,
    };
  }

  onApplicationShutdown() {
    this.timeoutIds.forEach(clearTimeout);
  }
}
