import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private static readonly EXPIRATION_CLEANUP_INTERVAL_MS = 60_000;

  private _storage: Map<string, ThrottlerStorageOptions> = new Map();
  private expirations: Map<string, Map<string, number[]>> = new Map();
  private expirationCleanupIntervalId: NodeJS.Timeout;

  constructor() {
    this.expirationCleanupIntervalId = setInterval(
      () => this.clearExpiredRecords(),
      ThrottlerStorageService.EXPIRATION_CLEANUP_INTERVAL_MS,
    );
    this.expirationCleanupIntervalId.unref?.();
  }

  get storage(): Map<string, ThrottlerStorageOptions> {
    return this._storage;
  }

  /**
   * Get the expiration time in seconds from a single record.
   */
  private getExpirationTime(key: string): number {
    return Math.ceil((this.storage.get(key).expiresAt - Date.now()) / 1000);
  }

  /**
   * Get the block expiration time in seconds from a single record.
   */
  private getBlockExpirationTime(key: string): number {
    return Math.ceil((this.storage.get(key).blockExpiresAt - Date.now()) / 1000);
  }

  /**
   * Reset the request blockage
   */
  private resetBlockedRequest(key: string, throttlerName: string) {
    this.storage.get(key).isBlocked = false;
    this.storage.get(key).totalHits.set(throttlerName, 0);
    this.expirations.get(key).set(throttlerName, []);
  }

  /**
   * Increase the `totalHit` count and register when it expires.
   */
  private fireHitCount(key: string, throttlerName: string, ttl: number) {
    const { totalHits } = this.storage.get(key);
    totalHits.set(throttlerName, totalHits.get(throttlerName) + 1);
    this.expirations
      .get(key)
      .get(throttlerName)
      .push(Date.now() + ttl);
  }

  private ensureThrottlerNameEntry(key: string, throttlerName: string): void {
    if (!this.storage.get(key).totalHits.has(throttlerName)) {
      this.storage.get(key).totalHits.set(throttlerName, 0);
    }

    if (!this.expirations.get(key).has(throttlerName)) {
      this.expirations.get(key).set(throttlerName, []);
    }
  }

  private pruneExpiredHits(key: string, throttlerName: string): void {
    const now = Date.now();
    const expirations = this.expirations.get(key).get(throttlerName);
    const unexpiredExpirations = expirations.filter((expiresAt) => expiresAt > now);

    this.expirations.get(key).set(throttlerName, unexpiredExpirations);
    this.storage.get(key).totalHits.set(throttlerName, unexpiredExpirations.length);
  }

  private clearExpiredRecords(): void {
    for (const [key, expirations] of this.expirations) {
      for (const throttlerName of expirations.keys()) {
        this.pruneExpiredHits(key, throttlerName);
      }

      const record = this.storage.get(key);
      const hasActiveHits = Array.from(record.totalHits.values()).some(
        (totalHits) => totalHits > 0,
      );
      const isBlocked = record.isBlocked && record.blockExpiresAt > Date.now();

      if (!hasActiveHits && !isBlocked) {
        this.storage.delete(key);
        this.expirations.delete(key);
      }
    }
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

    if (!this.storage.has(key)) {
      this.storage.set(key, {
        totalHits: new Map([[throttlerName, 0]]),
        expiresAt: Date.now() + ttlMilliseconds,
        blockExpiresAt: 0,
        isBlocked: false,
      });
      this.expirations.set(key, new Map([[throttlerName, []]]));
    }
    this.ensureThrottlerNameEntry(key, throttlerName);

    this.pruneExpiredHits(key, throttlerName);

    let timeToExpire = this.getExpirationTime(key);

    // Reset the timeToExpire once it has been expired.
    if (timeToExpire <= 0) {
      this.storage.get(key).expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    if (!this.storage.get(key).isBlocked) {
      this.fireHitCount(key, throttlerName, ttlMilliseconds);
    }

    // Reset the blockExpiresAt once it gets blocked
    if (
      this.storage.get(key).totalHits.get(throttlerName) > limit &&
      !this.storage.get(key).isBlocked
    ) {
      this.storage.get(key).isBlocked = true;
      this.storage.get(key).blockExpiresAt = Date.now() + blockDurationMilliseconds;
    }

    const timeToBlockExpire = this.getBlockExpirationTime(key);

    // Reset time blocked request
    if (timeToBlockExpire <= 0 && this.storage.get(key).isBlocked) {
      this.resetBlockedRequest(key, throttlerName);
      this.fireHitCount(key, throttlerName, ttlMilliseconds);
    }

    return {
      totalHits: this.storage.get(key).totalHits.get(throttlerName),
      timeToExpire,
      isBlocked: this.storage.get(key).isBlocked,
      timeToBlockExpire: timeToBlockExpire,
    };
  }

  onApplicationShutdown() {
    clearInterval(this.expirationCleanupIntervalId);
    this.expirations.clear();
  }
}
