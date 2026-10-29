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
 * The hits, window and block of one throttler on one key.
 *
 * Throttlers share a key when a custom `generateKey` leaves the throttler name
 * out. Each one keeps its own state, so the block and `ttl` of one never apply
 * to another.
 */
interface ThrottlerState {
  /**
   * When each counted hit expires.
   *
   * Hits used to be decremented by one `setTimeout` each. A timer created
   * while handling a request retains that request's `AsyncLocalStorage`
   * stores (e.g. an ORM's per-request entity manager) until it fires, so the
   * whole request context stayed in memory for the full TTL. Timestamps are
   * pruned on access instead.
   */
  hitExpirations: number[];
  /**
   * Unix timestamp in milliseconds when the current window ends.
   */
  expiresAt: number;
  isBlocked: boolean;
  /**
   * Unix timestamp in milliseconds when the block ends.
   */
  blockExpiresAt: number;
}

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage, OnApplicationShutdown {
  private _storage: Map<string, ThrottlerStorageOptions> = new Map();
  /**
   * The state of each throttler, per record and throttler name. The record
   * sums it up per key.
   *
   * Keyed by the record rather than by its key, so the state leaves with the
   * record however it is removed: by the sweep, `storage.clear()` or
   * `storage.delete()`.
   */
  private throttlerStates: WeakMap<ThrottlerStorageOptions, Map<string, ThrottlerState>> =
    new WeakMap();
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
      if (this.hasLiveHits(record, now)) {
        continue;
      }
      this._storage.delete(key);
    }
  }

  private hasLiveHits(record: ThrottlerStorageOptions, now: number): boolean {
    const states = this.throttlerStates.get(record);
    if (!states) {
      return false;
    }
    for (const { hitExpirations } of states.values()) {
      if (hitExpirations.some((expiresAt) => expiresAt > now)) {
        return true;
      }
    }
    return false;
  }

  private getThrottlerState(
    record: ThrottlerStorageOptions,
    throttlerName: string,
  ): ThrottlerState {
    let states = this.throttlerStates.get(record);
    if (!states) {
      states = new Map();
      this.throttlerStates.set(record, states);
    }
    let state = states.get(throttlerName);
    if (!state) {
      state = { hitExpirations: [], expiresAt: 0, isBlocked: false, blockExpiresAt: 0 };
      states.set(throttlerName, state);
    }
    return state;
  }

  /**
   * Sum up the throttlers of a key in its record: the hit count of each, the
   * latest window, and whether any of them is blocked and until when.
   */
  private syncRecord(record: ThrottlerStorageOptions): void {
    record.expiresAt = 0;
    record.isBlocked = false;
    record.blockExpiresAt = 0;
    for (const [throttlerName, state] of this.throttlerStates.get(record)) {
      record.totalHits.set(throttlerName, state.hitExpirations.length);
      record.expiresAt = Math.max(record.expiresAt, state.expiresAt);
      if (state.isBlocked) {
        record.isBlocked = true;
        record.blockExpiresAt = Math.max(record.blockExpiresAt, state.blockExpiresAt);
      }
    }
  }

  /**
   * Drop the expired hits of a throttler.
   */
  private pruneExpiredHits(state: ThrottlerState, now = Date.now()): void {
    state.hitExpirations = state.hitExpirations.filter((expiresAt) => expiresAt > now);
  }

  /**
   * Get the expiration time in seconds of a throttler's window.
   */
  private getExpirationTime(state: ThrottlerState): number {
    return Math.ceil((state.expiresAt - Date.now()) / 1000);
  }

  /**
   * Get the block expiration time in seconds of a throttler.
   */
  private getBlockExpirationTime(state: ThrottlerState): number {
    return Math.ceil((state.blockExpiresAt - Date.now()) / 1000);
  }

  /**
   * Reset the request blockage
   */
  private resetBlockedRequest(state: ThrottlerState) {
    state.isBlocked = false;
    state.hitExpirations = [];
  }

  /**
   * Record when a counted hit expires.
   */
  private fireHitCount(state: ThrottlerState, ttl: number) {
    state.hitExpirations.push(Date.now() + ttl);
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
    state: ThrottlerState,
    ttlMilliseconds: number,
    limit: number,
    timeToExpire: number,
  ): ThrottlerStorageRecord {
    const isBlocked = state.hitExpirations.length >= limit;
    if (!isBlocked) {
      this.fireHitCount(state, ttlMilliseconds);
    }
    const hits = state.hitExpirations;
    // With `limit: 0` there is no hit to wait for, only the window itself.
    const timeToBlockExpire = hits.length
      ? Math.ceil((Math.min(...hits) - Date.now()) / 1000)
      : timeToExpire;
    return {
      // Count the rejected request too, so a blocked result reports `totalHits > limit`.
      totalHits: hits.length + (isBlocked ? 1 : 0),
      timeToExpire,
      isBlocked,
      // The next request is let through once the oldest hit expires.
      timeToBlockExpire: isBlocked ? timeToBlockExpire : 0,
    };
  }

  /**
   * Count a hit when a block duration is configured.
   *
   * Once a hit takes the window over `limit`, requests are rejected until the
   * block ends, and the first one after it starts a fresh count.
   */
  private incrementWithBlock(
    state: ThrottlerState,
    ttlMilliseconds: number,
    limit: number,
    blockDurationMilliseconds: number,
    timeToExpire: number,
  ): ThrottlerStorageRecord {
    if (!state.isBlocked) {
      this.fireHitCount(state, ttlMilliseconds);
    }

    // Reset the blockExpiresAt once it gets blocked
    if (state.hitExpirations.length > limit && !state.isBlocked) {
      state.isBlocked = true;
      state.blockExpiresAt = Date.now() + blockDurationMilliseconds;
    }

    const timeToBlockExpire = this.getBlockExpirationTime(state);

    // Reset time blocked request
    if (timeToBlockExpire <= 0 && state.isBlocked) {
      this.resetBlockedRequest(state);
      this.fireHitCount(state, ttlMilliseconds);
    }

    return {
      totalHits: state.hitExpirations.length,
      timeToExpire,
      isBlocked: state.isBlocked,
      timeToBlockExpire: timeToBlockExpire,
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

    let record = this.storage.get(key);
    if (!record) {
      record = { totalHits: new Map(), expiresAt: 0, blockExpiresAt: 0, isBlocked: false };
      this.storage.set(key, record);
    }
    const state = this.getThrottlerState(record, throttlerName);
    this.pruneExpiredHits(state);

    let timeToExpire = this.getExpirationTime(state);

    // Reset the timeToExpire once it has been expired.
    if (timeToExpire <= 0) {
      state.expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(state);
    }

    const result =
      blockDurationMilliseconds <= 0
        ? this.incrementWithoutBlock(state, ttlMilliseconds, limit, timeToExpire)
        : this.incrementWithBlock(
            state,
            ttlMilliseconds,
            limit,
            blockDurationMilliseconds,
            timeToExpire,
          );
    this.syncRecord(record);
    return result;
  }

  onApplicationShutdown() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = undefined;
    }
    this._storage.clear();
  }
}
