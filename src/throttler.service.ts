import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface.js';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface.js';
import { ThrottlerStorage } from './throttler-storage.interface.js';

/**
 * How often, in milliseconds, idle records are swept out of the in-memory map.
 */
export const DEFAULT_SWEEP_INTERVAL = 60_000;

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private _storage: Map<string, ThrottlerStorageOptions> = new Map();
  private timeoutIds: Map<string, NodeJS.Timeout[]> = new Map();
  private sweepInterval?: NodeJS.Timeout;

  /**
   * How often idle records are swept out of the map. Subclasses may override.
   */
  protected readonly sweepIntervalMs: number = DEFAULT_SWEEP_INTERVAL;

  /**
   * Start the sweep on first use, so an instance that never sees traffic never
   * owns a timer and a subclass field override is honoured.
   */
  private ensureSweep(): void {
    if (this.sweepInterval) {
      return;
    }
    this.sweepInterval = setInterval(() => this.evictIdleRecords(), this.sweepIntervalMs);
    // Never keep the event loop alive just to run the sweep.
    this.sweepInterval.unref?.();
  }

  get storage(): Map<string, ThrottlerStorageOptions> {
    return this._storage;
  }

  /**
   * Drop records that can no longer influence a decision.
   *
   * Without this the map grows one permanent entry per distinct tracker for
   * the lifetime of the process, so a stream of requests from unique source
   * addresses turns into unbounded memory growth.
   *
   * A record is only removed once every pending decrement has fired (an empty
   * timeout list means `totalHits` has drained to zero) and any block has
   * elapsed, so eviction reclaims memory without shortening a live window.
   */
  private evictIdleRecords(now = Date.now()): void {
    for (const [key, record] of this._storage) {
      const pending = this.timeoutIds.get(key);
      if (pending && pending.length > 0) {
        continue;
      }
      if (record.isBlocked && record.blockExpiresAt > now) {
        continue;
      }
      if (record.expiresAt > now) {
        continue;
      }
      this.timeoutIds.delete(key);
      this._storage.delete(key);
    }
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
   * Set the expiration time for a given key.
   */
  private setExpirationTime(key: string, ttlMilliseconds: number, throttlerName: string): void {
    const timeoutId = setTimeout(() => {
      // The record and its timeout list are removed together by eviction, and
      // only once no timer is pending, so both lookups should succeed. Guard
      // them anyway: a throw inside a timer takes the whole process down.
      const record = this.storage.get(key);
      if (record) {
        const { totalHits } = record;
        totalHits.set(throttlerName, totalHits.get(throttlerName) - 1);
      }
      clearTimeout(timeoutId);
      const pending = this.timeoutIds.get(key);
      if (pending) {
        this.timeoutIds.set(
          key,
          pending.filter((id) => id !== timeoutId),
        );
      }
    }, ttlMilliseconds);
    this.timeoutIds.get(key).push(timeoutId);
  }

  /**
   * Clear the expiration time related to the throttle
   */
  private clearExpirationTimes(key: string) {
    this.timeoutIds.get(key).forEach(clearTimeout);
    this.timeoutIds.set(key, []);
  }

  /**
   * Reset the request blockage
   */
  private resetBlockedRequest(key: string, throttlerName: string) {
    this.storage.get(key).isBlocked = false;
    this.storage.get(key).totalHits.set(throttlerName, 0);
    this.clearExpirationTimes(key);
  }

  /**
   * Increase the `totalHit` count and sent it to decrease queue
   */
  private fireHitCount(key: string, throttlerName: string, ttl: number) {
    const { totalHits } = this.storage.get(key);
    totalHits.set(throttlerName, totalHits.get(throttlerName) + 1);
    this.setExpirationTime(key, ttl, throttlerName);
  }

  /**
   * Count a hit when no block duration is configured.
   *
   * There is no block to serve out once the limit is reached: a request is
   * rejected while the window holds `limit` hits and let through again as soon
   * as the oldest of them expires. Rejected requests are not recorded, so a
   * client that keeps retrying cannot extend its own window or pile up timers.
   */
  private incrementWithoutBlock(
    key: string,
    ttlMilliseconds: number,
    limit: number,
    throttlerName: string,
    timeToExpire: number,
  ): ThrottlerStorageRecord {
    const { totalHits } = this.storage.get(key);
    const isBlocked = totalHits.get(throttlerName) >= limit;
    if (!isBlocked) {
      this.fireHitCount(key, throttlerName, ttlMilliseconds);
    }
    return {
      // Count the rejected request too, so a blocked result reports `totalHits > limit`.
      totalHits: totalHits.get(throttlerName) + (isBlocked ? 1 : 0),
      timeToExpire,
      isBlocked,
      // Every live hit expires before the current window does.
      timeToBlockExpire: isBlocked ? timeToExpire : 0,
    };
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

    this.ensureSweep();

    if (!this.timeoutIds.has(key)) {
      this.timeoutIds.set(key, []);
    }

    if (!this.storage.has(key)) {
      this.storage.set(key, {
        totalHits: new Map([[throttlerName, 0]]),
        expiresAt: Date.now() + ttlMilliseconds,
        blockExpiresAt: 0,
        isBlocked: false,
      });
    }

    let timeToExpire = this.getExpirationTime(key);

    // Reset the timeToExpire once it has been expired.
    if (timeToExpire <= 0) {
      this.storage.get(key).expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    if (blockDurationMilliseconds <= 0) {
      return this.incrementWithoutBlock(key, ttlMilliseconds, limit, throttlerName, timeToExpire);
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
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = undefined;
    }
    this.timeoutIds.forEach((timeouts) => timeouts.forEach(clearTimeout));
    this.timeoutIds.clear();
    this._storage.clear();
  }
}
