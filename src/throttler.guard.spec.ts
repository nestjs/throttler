import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from './throttler-storage.interface';
import { ThrottlerWsException } from './throttler-ws.exception';
import { THROTTLER_OPTIONS } from './throttler.constants';
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
  });
  describe('WS Context', () => {
    it('should allow the ws request to pass through', async () => {
      handler = function wsHandler() {
        return 'string';
      };
      const ctxMock = contextMockFactory('ws', handler, {
        getClient: () => ({
          conn: {
            remoteAddress: '127.0.0.1',
          },
        }),
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
    });
    it('should throw an error at too many requests', async () => {
      handler = function wsHandler() {
        return 'string';
      };
      const ctxMock = contextMockFactory('ws', handler, {
        getClient: () => ({
          conn: {
            remoteAddress: '127.0.0.1',
          },
        }),
      });
      for (let i = 0; i < 5; i++) {
        const canActivate = await guard.canActivate(ctxMock);
        expect(canActivate).toBe(true);
      }
      await expect(guard.canActivate(ctxMock)).rejects.toThrowError(ThrottlerWsException);
    });
  });
  describe('Graphql Context', () => {
    it('should run the gql context successfully', async () => {
      handler = function graphQLHandler() {
        return 'string';
      };
      const headerSettingMock = jest.fn();
      const resMock = {
        header: headerSettingMock,
      };
      const reqMock = {
        headers: {},
      };
      const ctxMock = contextMockFactory('graphql', handler, { req: reqMock, res: resMock });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(headerSettingMock).toBeCalledTimes(3);
    });
    it('should return early due to missing res from context', async () => {
      handler = function graphQLHandler() {
        return 'string';
      };
      const reqMock = {
        headers: {},
      };
      const ctxMock = contextMockFactory('graphql', handler, { req: reqMock, res: undefined });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
    });
  });
  describe('Throttler Skip present', () => {
    it('should skip the route', async () => {
      handler = function throttlerSkip() {
        return 'string';
      };
      reflector.getAllAndOverride = () => true as any;
      const headerSettingMock = jest.fn();
      const resMock = {
        header: headerSettingMock,
      };
      const reqMock = {
        headers: {},
      };
      const ctxMock = contextMockFactory('http', handler, {
        getResponse: () => resMock,
        getRequest: () => reqMock,
      });
      const canActivate = await guard.canActivate(ctxMock);
      expect(canActivate).toBe(true);
      expect(headerSettingMock).toBeCalledTimes(0);
    });
  });
  describe('RPC Context (WHY???)', () => {
    it('should return due to default context tye', async () => {
      handler = function rpcHandler() {
        return 'string';
      };
      const ctxMock = {
        getType: () => 'rpc',
        getHandler: () => handler,
        getClass: () => ThrottlerStorageServiceMock,
      };
      const canActivate = await guard.canActivate(ctxMock as any);
      expect(canActivate).toBe(true);
    });
  });
});
