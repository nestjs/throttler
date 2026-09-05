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

  it('should coerce numeric string ttl and behave correctly', async () => {
    // ConfigService.get<number>() returns strings from env vars — Number() must handle them
    const result = await service.increment('test', '1000' as unknown as number, 10, 0, 'test');
    expect(result.timeToExpire).toBe(1);
    expect(result.totalHits).toBe(1);
  });

  it('should coerce numeric string limit and behave correctly', async () => {
    const result = await service.increment('test', 1000, '10' as unknown as number, 0, 'test');
    expect(result.isBlocked).toBe(false);
    expect(result.totalHits).toBe(1);
  });

  it('should throw a descriptive error when ttl is a non-numeric string', async () => {
    await expect(
      service.increment('test', 'invalid' as unknown as number, 10, 0, 'test'),
    ).rejects.toThrow('ThrottlerStorage: ttl must be a positive finite number, got "invalid"');
  });

  it('should throw a descriptive error when limit is a non-numeric string', async () => {
    await expect(
      service.increment('test', 1000, 'invalid' as unknown as number, 0, 'test'),
    ).rejects.toThrow('ThrottlerStorage: limit must be a positive finite number, got "invalid"');
  });

  it('should throw when ttl is NaN', async () => {
    await expect(service.increment('test', NaN, 10, 0, 'test')).rejects.toThrow(
      'ThrottlerStorage: ttl must be a positive finite number',
    );
  });

  it('should throw when ttl is zero or negative', async () => {
    await expect(service.increment('test', 0, 10, 0, 'test')).rejects.toThrow(
      'ThrottlerStorage: ttl must be a positive finite number',
    );
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
