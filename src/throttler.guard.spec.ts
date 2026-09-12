import { ExecutionContext } from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_OPTIONS } from './throttler.constants';
import { ThrottlerException } from './throttler.exception';
import { ThrottlerGuard } from './throttler.guard';

class ThrottlerStorageServiceMock implements ThrottlerStorage {
  private _storage: Map<string, ThrottlerStorageOptions> = new Map();
  get storage(): Map<string, ThrottlerStorageOptions> {
    return this._storage;
  }

  private getExpirationTime(key: string): number {
    return Math.floor((this.storage[key].expiresAt - Date.now()) / 1000);
  }

  private getBlockExpirationTime(key: string): number {
    return Math.floor((this.storage[key].blockExpiresAt - Date.now()) / 1000);
  }

  private fireHitCount(key: string, throttlerName: string) {
    this.storage[key].totalHits[throttlerName]++;
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
    if (!this.storage[key]) {
      this.storage[key] = {
        totalHits: {
          [throttlerName]: 0,
        },
        expiresAt: Date.now() + ttlMilliseconds,
        blockExpiresAt: 0,
        isBlocked: false,
      };
    }

    let timeToExpire = this.getExpirationTime(key);

    // Reset the `expiresAt` once it has been expired.
    if (timeToExpire <= 0) {
      this.storage[key].expiresAt = Date.now() + ttlMilliseconds;
      timeToExpire = this.getExpirationTime(key);
    }

    if (!this.storage[key].isBlocked) {
      this.fireHitCount(key, throttlerName);
    }

    // Reset the blockExpiresAt once it gets blocked
    if (this.storage[key].totalHits[throttlerName] > limit && !this.storage[key].isBlocked) {
      this.storage[key].isBlocked = true;
      this.storage[key].blockExpiresAt = Date.now() + blockDurationMilliseconds;
    }

    const timeToBlockExpire = this.getBlockExpirationTime(key);

    if (timeToBlockExpire <= 0 && this.storage[key].isBlocked) {
      this.fireHitCount(key, throttlerName);
    }

    return {
      totalHits: this.storage[key].totalHits[throttlerName],
      timeToExpire,
      isBlocked: this.storage[key].isBlocked,
      timeToBlockExpire: timeToBlockExpire,
    };
  }
}

function contextMockFactory(
  type: 'http' | 'ws' | 'graphql',
  handler: () => any,
  mockFunc: Record<string, any>,
): ExecutionContext {
  const executionPartial: Partial<ExecutionContext> = {
    getClass: () => ThrottlerStorageServiceMock as any,
    getHandler: () => handler,
    switchToRpc: () => ({
      getContext: () => ({}) as any,
      getData: () => ({}) as any,
    }),
    getArgs: () => [] as any,
    getArgByIndex: () => ({}) as any,
    getType: () => type as any,
  };
  switch (type) {
    case 'ws':
      executionPartial.switchToHttp = () => ({}) as any;
      executionPartial.switchToWs = () => mockFunc as any;
      break;
    case 'http':
      executionPartial.switchToWs = () => ({}) as any;
      executionPartial.switchToHttp = () => mockFunc as any;
      break;
    case 'graphql':
      executionPartial.switchToWs = () => ({}) as any;
      executionPartial.switchToHttp = () =>
        ({
          getNext: () => ({}) as any,
        }) as any;
      executionPartial.getArgByIndex = () => mockFunc as any;
      break;
  }
  return executionPartial as ExecutionContext;
}

const createMockHttpAdapterHost = (setHeaderMock: jest.Mock) => ({
  httpAdapter: {
    setHeader: setHeaderMock,
    getRequestHostname: jest.fn(),
    getRequestMethod: jest.fn(),
    getRequestUrl: jest.fn(),
    reply: jest.fn(),
    status: jest.fn(),
  },
});

describe('ThrottlerGuard', () => {
  let guard: ThrottlerGuard;
  let reflector: Reflector;
  let service: ThrottlerStorageServiceMock;
  let handler: () => any;
  let setHeaderMock: jest.Mock;

  beforeEach(async () => {
    setHeaderMock = jest.fn();
    const modRef = await Test.createTestingModule({
      providers: [
        ThrottlerGuard,
        {
          provide: THROTTLER_OPTIONS,
          useValue: [
            {
              limit: 5,
              ttl: 60,
              ignoreUserAgents: [/userAgentIgnore/],
            },
          ],
        },
        {
          provide: ThrottlerStorage,
          useClass: ThrottlerStorageServiceMock,
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: HttpAdapterHost,
          useValue: createMockHttpAdapterHost(setHeaderMock),
        },
      ],
    }).compile();
    guard = modRef.get(ThrottlerGuard);
    await guard.onModuleInit();
    reflector = modRef.get(Reflector);
    service = modRef.get<ThrottlerStorageServiceMock>(ThrottlerStorage);
  });

  it('should have all of the providers defined', () => {
    expect(guard).toBeDefined();
    expect(reflector).toBeDefined();
    expect(service).toBeDefined();
  });
  describe('HTTP Context', () => {
    let reqMock;
    let resMock;

    beforeEach(() => {
      setHeaderMock.mockClear();
      resMock = {};
      reqMock = {
        headers: {},
      };
    });
    afterEach(() => {
      setHeaderMock.mockClear();
    });
    it('should add headers to the res', async () => {
      handler = function addHeaders() {
        return 'string';
      };
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(setHeaderMock).toBeCalledTimes(3);
      expect(setHeaderMock).toHaveBeenNthCalledWith(1, resMock, 'X-RateLimit-Limit', '5');
      expect(setHeaderMock).toHaveBeenNthCalledWith(2, resMock, 'X-RateLimit-Remaining', '4');
      expect(setHeaderMock).toHaveBeenNthCalledWith(
        3,
        resMock,
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });
    it('should return an error after passing the limit', async () => {
      handler = function returnError() {
        return 'string';
      };
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      for (let i = 0; i < 5; i++) {
        await guard.canActivate(ctxMock);
      }
      await expect(guard.canActivate(ctxMock)).rejects.toThrowError(ThrottlerException);
      expect(setHeaderMock).toBeCalledTimes(16);
      expect(setHeaderMock).toHaveBeenLastCalledWith(resMock, 'Retry-After', expect.any(String));
    });
    it('should pull values from the reflector instead of options', async () => {
      handler = function useReflector() {
        return 'string';
      };
      reflector.getAllAndOverride = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(2);
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(setHeaderMock).toBeCalledTimes(3);
      expect(setHeaderMock).toHaveBeenNthCalledWith(1, resMock, 'X-RateLimit-Limit', '2');
      expect(setHeaderMock).toHaveBeenNthCalledWith(2, resMock, 'X-RateLimit-Remaining', '1');
      expect(setHeaderMock).toHaveBeenNthCalledWith(
        3,
        resMock,
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });
    it('should skip due to the user-agent header', async () => {
      handler = function userAgentSkip() {
        return 'string';
      };
      reqMock['headers'] = {
        'user-agent': 'userAgentIgnore',
      };
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(setHeaderMock).toBeCalledTimes(0);
    });
    it('should accept callback options for ttl and limit', async () => {
      const localSetHeaderMock = jest.fn();
      const modRef = await Test.createTestingModule({
        providers: [
          ThrottlerGuard,
          {
            provide: THROTTLER_OPTIONS,
            useValue: [
              {
                limit: () => 5,
                ttl: () => 60,
                ignoreUserAgents: [/userAgentIgnore/],
              },
            ],
          },
          {
            provide: ThrottlerStorage,
            useClass: ThrottlerStorageServiceMock,
          },
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          {
            provide: HttpAdapterHost,
            useValue: createMockHttpAdapterHost(localSetHeaderMock),
          },
        ],
      }).compile();
      const guard = modRef.get(ThrottlerGuard);
      await guard.onModuleInit();
      handler = function addHeaders() {
        return 'string';
      };
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(localSetHeaderMock).toBeCalledTimes(3);
      expect(localSetHeaderMock).toHaveBeenNthCalledWith(1, resMock, 'X-RateLimit-Limit', '5');
      expect(localSetHeaderMock).toHaveBeenNthCalledWith(2, resMock, 'X-RateLimit-Remaining', '4');
      expect(localSetHeaderMock).toHaveBeenNthCalledWith(
        3,
        resMock,
        'X-RateLimit-Reset',
        expect.any(String),
      );
    });
    it('should not add headers to the response when setHeaders is false', async () => {
      const localSetHeaderMock = jest.fn();
      const modRef = await Test.createTestingModule({
        providers: [
          ThrottlerGuard,
          {
            provide: THROTTLER_OPTIONS,
            useValue: [
              {
                limit: 5,
                ttl: 60,
                setHeaders: false,
              },
            ],
          },
          {
            provide: ThrottlerStorage,
            useClass: ThrottlerStorageServiceMock,
          },
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          {
            provide: HttpAdapterHost,
            useValue: createMockHttpAdapterHost(localSetHeaderMock),
          },
        ],
      }).compile();

      const guard = modRef.get(ThrottlerGuard);
      await guard.onModuleInit();

      const resMock = {};
      const reqMock = {
        headers: {},
      };

      handler = function noHeaders() {
        return 'string';
      };

      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });

      for (let i = 0; i < 5; i++) {
        const canActivate = await guard.canActivate(ctxMock);
        expect(canActivate).toBe(true);
      }

      expect(localSetHeaderMock).not.toHaveBeenCalled();

      await expect(guard.canActivate(ctxMock)).rejects.toThrowError(ThrottlerException);

      expect(localSetHeaderMock).not.toHaveBeenCalled();
    });
    it('should respect setHeaders option from commonOptions', async () => {
      const localSetHeaderMock = jest.fn();
      const modRef = await Test.createTestingModule({
        providers: [
          ThrottlerGuard,
          {
            provide: THROTTLER_OPTIONS,
            useValue: {
              throttlers: [
                {
                  limit: 5,
                  ttl: 60,
                },
              ],
              setHeaders: false,
            },
          },
          {
            provide: ThrottlerStorage,
            useClass: ThrottlerStorageServiceMock,
          },
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          {
            provide: HttpAdapterHost,
            useValue: createMockHttpAdapterHost(localSetHeaderMock),
          },
        ],
      }).compile();

      const guard = modRef.get(ThrottlerGuard);
      await guard.onModuleInit();

      handler = function commonOptionsTest() {
        return 'string';
      };

      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });

      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(localSetHeaderMock).not.toHaveBeenCalled();
    });
  });
});
