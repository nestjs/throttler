import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_OPTIONS, THROTTLER_SKIP } from './throttler.constants';
import { ThrottlerException } from './throttler.exception';
import { ThrottlerGuard } from './throttler.guard';

class ThrottlerStorageServiceMock implements ThrottlerStorage {
  private _storage: Record<string, number[]> = {};
  get storage(): Record<string, number[]> {
    return this._storage;
  }

  async getRecord(key: string): Promise<number[]> {
    return this.storage[key] || [];
  }

  async addRecord(key: string, ttl: number): Promise<void> {
    const ttlMilliseconds = ttl * 1000;
    if (!this.storage[key]) {
      this.storage[key] = [];
    }

    this.storage[key].push(Date.now() + ttlMilliseconds);
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
      getContext: () => ({} as any),
      getData: () => ({} as any),
    }),
    getArgs: () => [] as any,
    getArgByIndex: () => ({} as any),
    getType: () => type as any,
  };
  switch (type) {
    case 'ws':
      executionPartial.switchToHttp = () => ({} as any);
      executionPartial.switchToWs = () => mockFunc as any;
      break;
    case 'http':
      executionPartial.switchToWs = () => ({} as any);
      executionPartial.switchToHttp = () => mockFunc as any;
      break;
    case 'graphql':
      executionPartial.switchToWs = () => ({} as any);
      executionPartial.switchToHttp = () =>
        ({
          getNext: () => ({} as any),
        } as any);
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
  const ignoreIp = '127.0.0.1';
  const overrideIgnoreIp = '0.0.0.0';

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      providers: [
        ThrottlerGuard,
        {
          provide: THROTTLER_OPTIONS,
          useValue: {
            limit: 5,
            ttl: 60,
            ignoreUserAgents: [/userAgentIgnore/],
            skip(context, req, res) {
              return ignoreIp === req.ip;
            },
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
      ],
    }).compile();
    guard = modRef.get(ThrottlerGuard);
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
    let headerSettingMock: jest.Mock;

    beforeEach(() => {
      headerSettingMock = jest.fn();
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
      reflector.getAllAndOverride = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(2);
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

    it(`should skip due to the skip method return true when the IP is ${ignoreIp}`, async () => {
      handler = function userAgentSkip() {
        return 'string';
      };
      reqMock['ip'] = ignoreIp;
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(headerSettingMock).toBeCalledTimes(0);
    });
    it(`should not skip due to the skip method return false when the IP is not ${ignoreIp}`, async () => {
      handler = function userAgentSkip() {
        return 'string';
      };
      reqMock['ip'] = '192.168.1.1';
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
    it(`should skip due to the skip method return true when the IP is ${overrideIgnoreIp}`, async () => {
      handler = function useReflector() {
        return 'string';
      };
      reflector.getAllAndOverride = jest.fn().mockImplementation((metadataKey) => {
        if (metadataKey === THROTTLER_SKIP) {
          return (context, req, res) => {
            return overrideIgnoreIp === req.ip;
          };
        }
      });
      reqMock.ip = overrideIgnoreIp;
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });

      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(headerSettingMock).toBeCalledTimes(0);
    });
    it(`should not skip even the IP is ${ignoreIp}, because the skip method is null,`, async () => {
      handler = function useReflector() {
        return 'string';
      };
      reflector.getAllAndOverride = jest.fn().mockImplementation((metadataKey) => {
        if (metadataKey === THROTTLER_SKIP) {
          return null;
        }
      });
      reqMock.ip = ignoreIp;
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
  });
});
