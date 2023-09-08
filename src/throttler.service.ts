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
  private timeoutIds: Record<string, NodeJS.Timeout[]> = {};

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
   * Get the block expiration time in seconds from a single record.
   */
  private getBlockExpirationTime(key: string): number {
    return Math.floor((this.storage[key].blockExpiresAt - Date.now()) / 1000);
  }

  /**
   * Set the expiration time for a given key.
   */
  private setExpirationTime(key: string, ttlMilliseconds: number, throttlerName: string): void {
    const timeoutId = setTimeout(() => {
      this.storage[key].totalHits[throttlerName]--;
      clearTimeout(timeoutId);
      this.timeoutIds[throttlerName] = this.timeoutIds[throttlerName].filter(
        (id) => id != timeoutId,
      );
    }, ttlMilliseconds);
    this.timeoutIds[throttlerName].push(timeoutId);
  }

  /**
   * Clear the expiration time related to the throttle
   */
  private clearExpirationTimes(throttlerName: string) {
    this.timeoutIds[throttlerName].forEach(clearTimeout);
    this.timeoutIds[throttlerName] = [];
  }

  /**
   * Reset the request blockage
   */
  private resetBlockdRequest(key: string, throttlerName: string) {
    this.storage[key].isBlocked = false;
    this.storage[key].totalHits[throttlerName] = 0;
    this.clearExpirationTimes(throttlerName);
  }

  /**
   * Increase the `totalHit` count and sent it to decrease queue
   */
  private fireHitCount(key: string, throttlerName: string, ttl: number) {
    this.storage[key].totalHits[throttlerName]++;
    this.setExpirationTime(key, ttl, throttlerName);
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const ttlMilliseconds = ttl;
    const blockDurationMilliseconds = blockDuration;

    if (!this.timeoutIds[throttlerName]) {
      this.timeoutIds[throttlerName] = [];
    }

    if (!this.storage[key]) {
      this.storage[key] = {
        totalHits: {
          [throttlerName]: 0,
        },
        expiresAt: Date.now() + ttlMilliseconds,
        blockExpiresAt: 0,
        isBlocked: false,
      };
    }

    let timeToExpire = this.getExpirationTime(key);

    // Reset the timeToExpire once it has been expired.
    if (timeToExpire <= 0) {
      this.storage[key].expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    if (!this.storage[key].isBlocked) {
      this.fireHitCount(key, throttlerName, ttlMilliseconds);
    }

    // Reset the blockExpiresAt once it gets blocked
    if (this.storage[key].totalHits[throttlerName] > limit && !this.storage[key].isBlocked) {
      this.storage[key].isBlocked = true;
      this.storage[key].blockExpiresAt = Date.now() + blockDurationMilliseconds;
    }

    const timeToBlockExpire = this.getBlockExpirationTime(key);

    // Reset time blocked request
    if (timeToBlockExpire <= 0 && this.storage[key].isBlocked) {
      this.resetBlockdRequest(key, throttlerName);
      this.fireHitCount(key, throttlerName, ttlMilliseconds);
    }

    return {
      totalHits: this.storage[key].totalHits[throttlerName],
      timeToExpire,
      isBlocked: this.storage[key].isBlocked,
      timeToBlockExpire: timeToBlockExpire,
    };
  }

  onApplicationShutdown() {
    const throttleNames = Object.keys(this.timeoutIds);
    throttleNames.forEach((key) => {
      this.timeoutIds[key].forEach(clearTimeout);
    });
  }
}
