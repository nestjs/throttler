import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from './throttler-storage.interface';
import { ThrottlerStorageService } from './throttler.service';

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
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < 10; i++) {
      await service.increment('key1', ttl, 3, blockDuration, 'test').then((result) => {
        expect(result.isBlocked).toBe(false);
      });
      await service.increment('key2', ttl, 3, blockDuration, 'test');
      await service.increment('key2', ttl, 3, blockDuration, 'test');
      await sleep(50);
    }
  });

  describe('record eviction', () => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
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
