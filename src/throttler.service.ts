import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private _storage: Map<string, ThrottlerStorageOptions> = new Map();
  private timeoutIds: Map<string, NodeJS.Timeout[]> = new Map();

  get storage(): Map<string, ThrottlerStorageOptions> {
    return this._storage;
  }

  /**
   * Get the expiration time in seconds from a single record.
   */
  private getExpirationTime(key: string): number {
    return Math.floor((this.storage.get(key).expiresAt - Date.now()) / 1000);
  }

  /**
   * Get the block expiration time in seconds from a single record.
   */
  private getBlockExpirationTime(key: string): number {
    return Math.floor((this.storage.get(key).blockExpiresAt - Date.now()) / 1000);
  }

  /**
   * Set the expiration time for a given key.
   */
  private setExpirationTime(key: string, ttlMilliseconds: number, throttlerName: string): void {
    const timeoutId = setTimeout(() => {
      this.storage.get(key).totalHits[throttlerName]--;
      clearTimeout(timeoutId);
      this.timeoutIds.set(
        throttlerName,
        this.timeoutIds.get(throttlerName).filter((id) => id !== timeoutId),
      );
    }, ttlMilliseconds);
    this.timeoutIds.get(throttlerName).push(timeoutId);
  }

  /**
   * Clear the expiration time related to the throttle
   */
  private clearExpirationTimes(throttlerName: string) {
    this.timeoutIds.get(throttlerName).forEach(clearTimeout);
    this.timeoutIds.set(throttlerName, []);
  }

  /**
   * Reset the request blockage
   */
  private resetBlockdRequest(key: string, throttlerName: string) {
    this.storage.get(key).isBlocked = false;
    this.storage.get(key).totalHits[throttlerName] = 0;
    this.clearExpirationTimes(throttlerName);
  }

  /**
   * Increase the `totalHit` count and sent it to decrease queue
   */
  private fireHitCount(key: string, throttlerName: string, ttl: number) {
    this.storage.get(key).totalHits[throttlerName]++;
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

    if (!this.timeoutIds.has(throttlerName)) {
      this.timeoutIds.set(throttlerName, []);
    }

    if (!this.storage.has(key)) {
      this.storage.set(key, {
        totalHits: {
          [throttlerName]: 0,
        },
        expiresAt: Date.now() + ttlMilliseconds,
        blockExpiresAt: 0,
        isBlocked: false,
      });
    }

    let timeToExpire = this.getExpirationTime(key);

    // Reset the timeToExpire once it has been expired.
    if (timeToExpire <= 0) {
      this._storage.get(key).expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    if (!this.storage.get(key).isBlocked) {
      this.fireHitCount(key, throttlerName, ttlMilliseconds);
    }

    // Reset the blockExpiresAt once it gets blocked
    if (
      this.storage.get(key).totalHits[throttlerName] > limit &&
      !this.storage.get(key).isBlocked
    ) {
      this.storage.get(key).isBlocked = true;
      this.storage.get(key).blockExpiresAt = Date.now() + blockDurationMilliseconds;
    }

    const timeToBlockExpire = this.getBlockExpirationTime(key);

    // Reset time blocked request
    if (timeToBlockExpire <= 0 && this.storage.get(key).isBlocked) {
      this.resetBlockdRequest(key, throttlerName);
      this.fireHitCount(key, throttlerName, ttlMilliseconds);
    }

    return {
      totalHits: this.storage.get(key).totalHits[throttlerName],
      timeToExpire,
      isBlocked: this.storage.get(key).isBlocked,
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
