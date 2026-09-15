import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ThrottlerModuleOptions,
  ThrottlerOptionsFactory,
} from './throttler-module-options.interface';
import { ThrottlerModule } from './throttler.module';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

@Injectable()
class CustomStorage implements ThrottlerStorage, OnModuleInit {
  static onModuleInitCalls = 0;

  onModuleInit() {
    CustomStorage.onModuleInitCalls++;
  }

  async increment(): Promise<ThrottlerStorageRecord> {
    return {
      totalHits: 1,
      timeToExpire: 1000,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}

@Module({
  providers: [CustomStorage],
  exports: [CustomStorage],
})
class CustomStorageModule {}

@Injectable()
class CustomOptionsFactory implements ThrottlerOptionsFactory {
  constructor(private readonly storage: CustomStorage) {}

  createThrottlerOptions(): ThrottlerModuleOptions {
    return {
      throttlers: [{ limit: 1, ttl: 1000 }],
      storage: this.storage,
    };
  }
}

@Module({
  imports: [CustomStorageModule],
  providers: [CustomOptionsFactory],
  exports: [CustomOptionsFactory],
})
class CustomOptionsModule {}

describe('ThrottlerModule', () => {
  beforeEach(() => {
    CustomStorage.onModuleInitCalls = 0;
  });

  it('calls custom storage onModuleInit once when provided by an async factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRootAsync({
          imports: [CustomStorageModule],
          inject: [CustomStorage],
          useFactory: (storage: CustomStorage) => ({
            throttlers: [{ limit: 1, ttl: 1000 }],
            storage,
          }),
        }),
      ],
    }).compile();

    await moduleRef.init();

    expect(CustomStorage.onModuleInitCalls).toBe(1);

    await moduleRef.close();
  });

  it('calls custom storage onModuleInit once when configured with useClass', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRootAsync({
          imports: [CustomStorageModule],
          useClass: CustomOptionsFactory,
        }),
      ],
    }).compile();

    await moduleRef.init();

    expect(CustomStorage.onModuleInitCalls).toBe(1);

    await moduleRef.close();
  });

  it('calls custom storage onModuleInit once when configured with useExisting', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRootAsync({
          imports: [CustomOptionsModule],
          useExisting: CustomOptionsFactory,
        }),
      ],
    }).compile();

    await moduleRef.init();

    expect(CustomStorage.onModuleInitCalls).toBe(1);

    await moduleRef.close();
  });

  it('delegates calls to custom storage passed directly in options', async () => {
    const storage = new CustomStorage();
    const incrementSpy = jest.spyOn(storage, 'increment');
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ limit: 1, ttl: 1000 }],
          storage,
        }),
      ],
    }).compile();

    await moduleRef.get(ThrottlerStorage).increment('key', 1000, 1, 1000, 'default');

    expect(incrementSpy).toHaveBeenCalledWith('key', 1000, 1, 1000, 'default');

    await moduleRef.close();
  });
});
