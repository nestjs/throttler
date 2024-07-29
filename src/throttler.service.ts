import { Injectable } from '@nestjs/common';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

/**
 * @publicApi
 */

@Injectable()
export class ThrottlerStorageService implements ThrottlerStorage {
  private windows: Map<string, SlidingWindow> = new Map();

  /**
   * Get or create the current window  by `key` and `throttlerName`
   */
  private getWindow(key: string, throttlerName: string): SlidingWindow {
    if (!this.windows.has(`${key}-${throttlerName}`)) {
      this.windows.set(`${key}-${throttlerName}`, new SlidingWindowImpl());
    }
    return this.windows.get(`${key}-${throttlerName}`);
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

    const window = this.getWindow(key, throttlerName);

    if (Date.now() < window.timeToBlockExpireMilliseconds) {
      return {
        isBlocked: true,
        timeToBlockExpire: window.timeToBlockExpire,
        totalHits: window.currentCount,
        timeToExpire: window.timeToBlockExpire,
      };
    }

    if (Date.now() - window.currentTime > ttlMilliseconds) {
      window.currentTime = Date.now();
      window.previousCount = window.currentCount;
      window.currentCount = 0;
    }

    const hits =
      (window.previousCount * (ttlMilliseconds - (Date.now() - window.currentTime))) /
        ttlMilliseconds +
      window.currentCount;

    if (hits > limit) {
      window.timeToBlockExpireMilliseconds = window.currentTime + blockDurationMilliseconds;
      return {
        isBlocked: true,
        timeToBlockExpire: window.timeToBlockExpire,
        totalHits: hits,
        timeToExpire: window.timeToBlockExpire,
      };
    }

    window.inc();

    return {
      isBlocked: false,
      timeToBlockExpire: 0,
      totalHits: hits + 1,
      timeToExpire: 0,
    };
  }
}

interface SlidingWindow {
  currentTime: number;
  currentCount: number;
  previousCount: number;
  timeToBlockExpireMilliseconds: number;
  timeToBlockExpire: number;
  inc(): number;
}

class SlidingWindowImpl implements SlidingWindow {
  currentTime = Date.now();
  currentCount = 0;
  previousCount = 0;
  timeToBlockExpireMilliseconds = 0;
  inc = () => ++this.currentCount;

  get timeToBlockExpire(): number {
    return this.timeToBlockExpireMilliseconds / 1000;
  }
}
