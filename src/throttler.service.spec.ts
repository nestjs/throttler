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
});
