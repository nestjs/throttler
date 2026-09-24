import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerStorageOptions } from './throttler-storage-options.interface.js';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface.js';
import { ThrottlerStorage } from './throttler-storage.interface.js';
import { THROTTLER_OPTIONS } from './throttler.constants.js';
import { ThrottlerException } from './throttler.exception.js';
import { ThrottlerGuard } from './throttler.guard.js';

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

describe('ThrottlerGuard', () => {
  let guard: ThrottlerGuard;
  let reflector: Reflector;
  let service: ThrottlerStorageServiceMock;
  let handler: () => any;

  beforeEach(async () => {
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
            getAllAndOverride: vi.fn(),
          },
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
    let headerSettingMock: Mock;

    beforeEach(() => {
      headerSettingMock = vi.fn();
      resMock = {
        header: headerSettingMock,
      };
      reqMock = {
        headers: {},
      };
    });
    afterEach(() => {
      headerSettingMock.mockClear();
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
      expect(headerSettingMock).toBeCalledTimes(3);
      expect(headerSettingMock).toHaveBeenNthCalledWith(1, 'X-RateLimit-Limit', 5);
      expect(headerSettingMock).toHaveBeenNthCalledWith(2, 'X-RateLimit-Remaining', 4);
      expect(headerSettingMock).toHaveBeenNthCalledWith(3, 'X-RateLimit-Reset', expect.any(Number));
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
      expect(headerSettingMock).toBeCalledTimes(16);
      expect(headerSettingMock).toHaveBeenLastCalledWith('Retry-After', expect.any(Number));
    });
    it('should pull values from the reflector instead of options', async () => {
      handler = function useReflector() {
        return 'string';
      };
      reflector.getAllAndOverride = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(2);
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(headerSettingMock).toBeCalledTimes(3);
      expect(headerSettingMock).toHaveBeenNthCalledWith(1, 'X-RateLimit-Limit', 2);
      expect(headerSettingMock).toHaveBeenNthCalledWith(2, 'X-RateLimit-Remaining', 1);
      expect(headerSettingMock).toHaveBeenNthCalledWith(3, 'X-RateLimit-Reset', expect.any(Number));
    });
    it('should respect an explicit route-level limit of 0 instead of falling back to the default', async () => {
      handler = function zeroLimit() {
        return 'string';
      };
      reflector.getAllAndOverride = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(0);
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      await expect(guard.canActivate(ctxMock)).rejects.toThrowError(ThrottlerException);
      expect(headerSettingMock).toBeCalledTimes(1);
      expect(headerSettingMock).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });
    it('should pass an explicit route-level blockDuration of 0 to the storage', async () => {
      handler = function zeroBlockDuration() {
        return 'string';
      };
      reflector.getAllAndOverride = vi
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce(0);
      const incrementSpy = vi.spyOn(service, 'increment');
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      await guard.canActivate(ctxMock);
      expect(incrementSpy).toHaveBeenCalledWith(expect.any(String), 60, 5, 0, 'default');
      incrementSpy.mockRestore();
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
      expect(headerSettingMock).toBeCalledTimes(0);
    });
    it('should accept callback options for ttl and limit', async () => {
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
              getAllAndOverride: vi.fn(),
            },
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
      expect(headerSettingMock).toBeCalledTimes(3);
      expect(headerSettingMock).toHaveBeenNthCalledWith(1, 'X-RateLimit-Limit', 5);
      expect(headerSettingMock).toHaveBeenNthCalledWith(2, 'X-RateLimit-Remaining', 4);
      expect(headerSettingMock).toHaveBeenNthCalledWith(3, 'X-RateLimit-Reset', expect.any(Number));
    });
    it('should fall back to setHeader when the response has no header method', async () => {
      handler = function setHeaderFallback() {
        return 'string';
      };
      const setHeaderMock = vi.fn();
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => ({ setHeader: setHeaderMock }),
        getRequest: () => reqMock,
      });
      for (let i = 0; i < 5; i++) {
        await guard.canActivate(ctxMock);
      }
      await expect(guard.canActivate(ctxMock)).rejects.toThrowError(ThrottlerException);
      expect(setHeaderMock).toHaveBeenNthCalledWith(1, 'X-RateLimit-Limit', 5);
      expect(setHeaderMock).toHaveBeenLastCalledWith('Retry-After', expect.any(Number));
    });
    it('should not fail when the response cannot set headers', async () => {
      handler = function noHeaderMethods() {
        return 'string';
      };
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => ({}),
        getRequest: () => reqMock,
      });
      await expect(guard.canActivate(ctxMock)).resolves.toBe(true);
    });
    it('should not add headers to the response when setHeaders is false', async () => {
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
              getAllAndOverride: vi.fn(),
            },
          },
        ],
      }).compile();

      const guard = modRef.get(ThrottlerGuard);
      await guard.onModuleInit();

      const headerSettingMock = vi.fn();
      const resMock = {
        header: headerSettingMock,
      };
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

      expect(headerSettingMock).not.toHaveBeenCalled();

      await expect(guard.canActivate(ctxMock)).rejects.toThrowError(ThrottlerException);

      expect(headerSettingMock).not.toHaveBeenCalled();
    });
    it('should respect setHeaders option from commonOptions', async () => {
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
              getAllAndOverride: vi.fn(),
            },
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
      expect(headerSettingMock).not.toHaveBeenCalled();
    });
  });

  describe('tracker normalization', () => {
    const makeGuard = async (options: Record<string, any>) => {
      const modRef = await Test.createTestingModule({
        providers: [
          ThrottlerGuard,
          { provide: THROTTLER_OPTIONS, useValue: options },
          { provide: ThrottlerStorage, useClass: ThrottlerStorageServiceMock },
          { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
        ],
      }).compile();
      const guard = modRef.get(ThrottlerGuard);
      await guard.onModuleInit();
      // `getTracker` is protected; reach in to test it directly.
      return (req: Record<string, any>) => (guard as any).getTracker(req) as Promise<string>;
    };

    it('masks IPv6 to a /64 by default', async () => {
      const getTracker = await makeGuard({ throttlers: [{ limit: 5, ttl: 60 }] });
      await expect(getTracker({ ip: '2001:db8:0:1:dead:beef:1:2' })).resolves.toBe(
        '2001:db8:0:1::/64',
      );
    });

    it('honours ipv6SubnetPrefix from the module options', async () => {
      const getTracker = await makeGuard({
        ipv6SubnetPrefix: 48,
        throttlers: [{ limit: 5, ttl: 60 }],
      });
      await expect(getTracker({ ip: '2001:db8:0:1:dead:beef:1:2' })).resolves.toBe('2001:db8::/48');
    });

    it('still masks when ipv6SubnetPrefix is not a finite number', async () => {
      const getTracker = await makeGuard({
        ipv6SubnetPrefix: Number(undefined),
        throttlers: [{ limit: 5, ttl: 60 }],
      });
      await expect(getTracker({ ip: '2001:db8:0:1:dead:beef:1:2' })).resolves.toBe(
        '2001:db8:0:1::/64',
      );
    });

    it('uses the default when options are given in array form', async () => {
      const getTracker = await makeGuard([{ limit: 5, ttl: 60 }]);
      await expect(getTracker({ ip: '2001:db8:0:1:dead:beef:1:2' })).resolves.toBe(
        '2001:db8:0:1::/64',
      );
    });
  });

  describe('empty configuration', () => {
    const buildGuard = async (options: Record<string, any>) => {
      const modRef = await Test.createTestingModule({
        providers: [
          ThrottlerGuard,
          { provide: THROTTLER_OPTIONS, useValue: options },
          { provide: ThrottlerStorage, useClass: ThrottlerStorageServiceMock },
          { provide: Reflector, useValue: { getAllAndOverride: vi.fn() } },
        ],
      }).compile();
      return modRef.get(ThrottlerGuard);
    };

    it('warns when no throttler is configured', async () => {
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const guard = await buildGuard([]);
      await guard.onModuleInit();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('No throttlers are configured'));
      warn.mockRestore();
    });

    it('does not warn when a throttler is configured', async () => {
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const guard = await buildGuard([{ limit: 5, ttl: 60 }]);
      await guard.onModuleInit();
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
