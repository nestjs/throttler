import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { AsyncResource } from 'async_hooks';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

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
  /**
   * When each counted hit expires, per record and throttler name.
   *
   * Hits used to be decremented by one `setTimeout` each. A timer created
   * while handling a request retains that request's `AsyncLocalStorage`
   * stores (e.g. an ORM's per-request entity manager) until it fires, so the
   * whole request context stayed in memory for the full TTL. Timestamps are
   * pruned on access instead.
   *
   * Keyed by the record rather than by its key, so the hits leave with the
   * record however it is removed: by the sweep, `storage.clear()` or
   * `storage.delete()`.
   */
  private hitExpirations: WeakMap<ThrottlerStorageOptions, Map<string, number[]>> = new WeakMap();
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
    this.startSweep();
  }

  /**
   * Bound to the async context the storage was created in. The first call
   * happens inside a request, and an interval created there would retain that
   * request's `AsyncLocalStorage` stores for the lifetime of the process.
   */
  private readonly startSweep = AsyncResource.bind(() => {
    this.sweepInterval = setInterval(() => this.evictIdleRecords(), this.sweepIntervalMs);
    // Never keep the event loop alive just to run the sweep.
    this.sweepInterval.unref?.();
  });

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
   * A record is only removed once every hit has expired and any block has
   * elapsed, so eviction reclaims memory without shortening a live window.
   */
  private evictIdleRecords(now = Date.now()): void {
    for (const [key, record] of this._storage) {
      if (record.isBlocked && record.blockExpiresAt > now) {
        continue;
      }
      if (record.expiresAt > now) {
        continue;
      }
      if (this.hasLiveHits(key, now)) {
        continue;
      }
      this._storage.delete(key);
    }
  }

  private hasLiveHits(key: string, now: number): boolean {
    const expirations = this.hitExpirations.get(this.storage.get(key));
    if (!expirations) {
      return false;
    }
    for (const hits of expirations.values()) {
      if (hits.some((expiresAt) => expiresAt > now)) {
        return true;
      }
    }
    return false;
  }

  private getHitExpirations(key: string, throttlerName: string): number[] {
    const record = this.storage.get(key);
    let expirations = this.hitExpirations.get(record);
    if (!expirations) {
      expirations = new Map();
      this.hitExpirations.set(record, expirations);
    }
    let hits = expirations.get(throttlerName);
    if (!hits) {
      hits = [];
      expirations.set(throttlerName, hits);
    }
    return hits;
  }

  /**
   * Drop the expired hits of a throttler and sync its `totalHits` count.
   */
  private pruneExpiredHits(key: string, throttlerName: string, now = Date.now()): void {
    const hits = this.getHitExpirations(key, throttlerName).filter((expiresAt) => expiresAt > now);
    this.hitExpirations.get(this.storage.get(key)).set(throttlerName, hits);
    this.storage.get(key).totalHits.set(throttlerName, hits.length);
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
    this.hitExpirations.get(this.storage.get(key)).set(throttlerName, []);
  }

  /**
   * Increase the `totalHit` count and record when the hit expires.
   */
  private fireHitCount(key: string, throttlerName: string, ttl: number) {
    const { totalHits } = this.storage.get(key);
    totalHits.set(throttlerName, totalHits.get(throttlerName) + 1);
    this.getHitExpirations(key, throttlerName).push(Date.now() + ttl);
  }

  /**
   * Count a hit when no block duration is configured.
   *
   * There is no block to serve out once the limit is reached: a request is
   * rejected while the window holds `limit` hits and let through again as soon
   * as the oldest of them expires. Rejected requests are not recorded, so a
   * client that keeps retrying cannot extend its own window.
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
    const hits = this.getHitExpirations(key, throttlerName);
    // With `limit: 0` there is no hit to wait for, only the window itself.
    const timeToBlockExpire = hits.length
      ? Math.ceil((Math.min(...hits) - Date.now()) / 1000)
      : timeToExpire;
    return {
      // Count the rejected request too, so a blocked result reports `totalHits > limit`.
      totalHits: totalHits.get(throttlerName) + (isBlocked ? 1 : 0),
      timeToExpire,
      isBlocked,
      // The next request is let through once the oldest hit expires.
      timeToBlockExpire: isBlocked ? timeToBlockExpire : 0,
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

    if (!this.storage.has(key)) {
      this.storage.set(key, {
        totalHits: new Map([[throttlerName, 0]]),
        expiresAt: Date.now() + ttlMilliseconds,
        blockExpiresAt: 0,
        isBlocked: false,
      });
    }
    this.pruneExpiredHits(key, throttlerName);

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
    this._storage.clear();
  }
}
