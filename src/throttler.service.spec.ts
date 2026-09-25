import { AsyncLocalStorage } from 'async_hooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from './throttler-storage.interface.js';
import { ThrottlerStorageService } from './throttler.service.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('ThrottlerStorageService', () => {
  let service: ThrottlerStorageService;

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      providers: [
        {
          provide: ThrottlerStorage,
          useClass: ThrottlerStorageService,
        },
      ],
    }).compile();
    service = modRef.get<ThrottlerStorageService>(ThrottlerStorage);
  });

  it('should have all of the providers defined', () => {
    expect(service).toBeDefined();
  });

  it('should increment the request count', async () => {
    const result = await service.increment('test', 1000, 1, 0, 'test');
    expect(result).toBeDefined();
    expect(result.totalHits).toBe(1);
    expect(result.timeToExpire).toBe(1);
    expect(result.isBlocked).toBe(false);
  });

  it('keys should be independent of each other over blocking and unblocking', async () => {
    // this test was added to specifically test the behavior of unblocking a key while
    // another key has active timeouts. These timeouts should not be affected since
    // they are critical for the throttler to function correctly.
    // the sleep is smaller than the ttl so key1 always has timeouts that are waiting.
    // key2 will be throttled because it makes 4 requests every ttl window
    const ttl = 100;
    const blockDuration = 100;

    for (let i = 0; i < 10; i++) {
      await service.increment('key1', ttl, 3, blockDuration, 'test').then((result) => {
        expect(result.isBlocked).toBe(false);
      });
      await service.increment('key2', ttl, 3, blockDuration, 'test');
      await service.increment('key2', ttl, 3, blockDuration, 'test');
      await sleep(50);
    }
  });

  describe('without a block duration', () => {
    it('rejects requests over the limit instead of resetting the counter', async () => {
      const ttl = 1000;
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await service.increment('no-block', ttl, 2, 0, 'test'));
      }
      expect(results.map((result) => result.isBlocked)).toEqual([false, false, true, true, true]);
      expect(results[2].totalHits).toBe(3);
      expect(results[2].timeToBlockExpire).toBeGreaterThan(0);
    });

    it('reports when the oldest hit expires as the time to wait', async () => {
      const ttl = 10_000;
      await service.increment('oldest', ttl, 1, 0, 'test');
      await sleep(1100);
      const result = await service.increment('oldest', ttl, 1, 0, 'test');
      expect(result.isBlocked).toBe(true);
      expect(result.timeToBlockExpire).toBe(9);
    });

    it('blocks every request for a limit of zero', async () => {
      const result = await service.increment('zero', 1000, 0, 0, 'test');
      expect(result.isBlocked).toBe(true);
      expect(result.timeToBlockExpire).toBe(1);
    });

    it('lets requests through again once the earlier hits expire', async () => {
      const ttl = 100;
      await service.increment('no-block', ttl, 2, 0, 'test');
      await service.increment('no-block', ttl, 2, 0, 'test');

      // Rejected retries are not recorded, so they do not extend the window.
      for (let i = 0; i < 5; i++) {
        await sleep(15);
        const result = await service.increment('no-block', ttl, 2, 0, 'test');
        expect(result.isBlocked).toBe(true);
      }

      await sleep(ttl);
      const result = await service.increment('no-block', ttl, 2, 0, 'test');
      expect(result.isBlocked).toBe(false);
      expect(result.totalHits).toBe(1);
    });
  });

  describe('request context retention', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not create a timer per hit', async () => {
      await service.increment('warm-up', 1000, 10, 1000, 'test');
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      for (let i = 0; i < 5; i++) {
        await service.increment('no-timers', 1000, 10, 1000, 'test');
      }
      expect(setTimeoutSpy).not.toHaveBeenCalled();
    });

    it('expires hits without timers', async () => {
      const ttl = 50;
      await service.increment('expiring', ttl, 2, ttl, 'test');
      await service.increment('expiring', ttl, 2, ttl, 'test');
      await sleep(ttl + 20);
      const result = await service.increment('expiring', ttl, 2, ttl, 'test');
      expect(result.totalHits).toBe(1);
      expect(result.isBlocked).toBe(false);
    });

    it('does not start the sweep inside the request context', async () => {
      class FastSweepStorage extends ThrottlerStorageService {
        protected readonly sweepIntervalMs = 10;
      }
      const storage = new FastSweepStorage();
      const als = new AsyncLocalStorage<{ request: string }>();
      let storeSeenBySweep: unknown = 'sweep never ran';
      (storage as any).evictIdleRecords = () => {
        storeSeenBySweep = als.getStore();
      };

      await als.run({ request: 'first' }, () => storage.increment('k', 1000, 10, 1000, 'test'));
      await sleep(40);
      storage.onApplicationShutdown();

      expect(storeSeenBySweep).toBeUndefined();
    });
  });

  describe('record eviction', () => {
    const sweep = () => (service as any).evictIdleRecords();

    it('drops records once their window has fully elapsed', async () => {
      const ttl = 50;
      for (let i = 0; i < 100; i++) {
        await service.increment(`tracker-${i}`, ttl, 10, 0, 'test');
      }
      expect(service.storage.size).toBe(100);

      // Nothing is evicted while the windows are still live.
      sweep();
      expect(service.storage.size).toBe(100);

      await sleep(ttl * 2);
      sweep();
      expect(service.storage.size).toBe(0);
    });

    it('does not evict a record that still has pending hits', async () => {
      const ttl = 500;
      await service.increment('busy', ttl, 10, 0, 'test');
      await sleep(50);
      sweep();
      expect(service.storage.has('busy')).toBe(true);

      // The surviving record keeps counting as before.
      const result = await service.increment('busy', ttl, 10, 0, 'test');
      expect(result.totalHits).toBe(2);
    });

    it('does not evict a record while it is still blocked', async () => {
      const ttl = 50;
      const blockDuration = 1000;
      await service.increment('blocked', ttl, 1, blockDuration, 'test');
      const blockedResult = await service.increment('blocked', ttl, 1, blockDuration, 'test');
      expect(blockedResult.isBlocked).toBe(true);

      await sleep(ttl * 2);
      sweep();
      expect(service.storage.has('blocked')).toBe(true);
    });
  });
});
