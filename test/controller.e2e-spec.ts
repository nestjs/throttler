import { INestApplication } from '@nestjs/common';
import { AbstractHttpAdapter, APP_GUARD } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerStorage, ThrottlerStorageService } from '../src';
import { ControllerModule } from './app/controllers/controller.module';
import { httPromise } from './utility/httpromise';

describe.each`
  adapter                 | adapterName
  ${new ExpressAdapter()} | ${'Express'}
  ${new FastifyAdapter()} | ${'Fastify'}
`('$adapterName Throttler', ({ adapter }: { adapter: AbstractHttpAdapter }) => {
  let app: INestApplication;
  let storageService: ThrottlerStorageService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ControllerModule],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication(adapter);
    storageService = moduleFixture.get<ThrottlerStorageService>(ThrottlerStorage);
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('controllers', () => {
    let appUrl: string;
    beforeAll(async () => {
      appUrl = await app.getUrl();
    });

    /**
     * Tests for setting `@Throttle()` at the method level and for ignore routes
     */
    describe('AppController', () => {
      it('GET /ignored', async () => {
        const response = await httPromise(appUrl + '/ignored');
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).not.toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('GET /ignore-user-agents', async () => {
        const response = await httPromise(appUrl + '/ignore-user-agents', 'GET', {
          'user-agent': 'throttler-test/0.0.0',
        });
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).not.toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('GET /', async () => {
        const response = await httPromise(appUrl + '/');
        expect(response.data).toEqual({ success: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
    });
    /**
     * Tests for setting `@Throttle()` at the class level and overriding at the method level
     */
    describe('LimitController', () => {
      it.each`
        method   | url          | limit
        ${'GET'} | ${''}        | ${2}
        ${'GET'} | ${'/higher'} | ${5}
      `(
        '$method $url',
        async ({ method, url, limit }: { method: 'GET'; url: string; limit: number }) => {
          for (let i = 0; i < limit; i++) {
            const response = await httPromise(appUrl + '/limit' + url, method);
            expect(response.data).toEqual({ success: true });
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit': limit.toString(),
              'x-ratelimit-remaining': (limit - (i + 1)).toString(),
              'x-ratelimit-reset': /\d+/,
            });
          }
          const errRes = await httPromise(appUrl + '/limit' + url, method);
          expect(errRes.data).toMatchObject({ statusCode: 429, message: /ThrottlerException/ });
          expect(errRes.headers).toMatchObject({
            'retry-after': /\d+/,
          });
          expect(errRes.status).toBe(429);
        },
      );
    });
    /**
     * Tests for setting throttle values at the `forRoot` level
     */
    describe('DefaultController', () => {
      it('GET /default', async () => {
        const response = await httPromise(appUrl + '/default');
        expect(response.data).toEqual({ success: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '5',
          'x-ratelimit-remaining': '4',
          'x-ratelimit-reset': /\d+/,
        });
      });
    });

    /**
     * Tests for setting `@SkipThrottle()` at the method level and for ignore routes
     */
    describe('SkipController', () => {
      beforeEach(() => {
        // clear storage
        Object.keys(storageService.storage).forEach((key) => delete storageService.storage[key]);
      });
      it('POST /skip: should skip', async () => {
        const response = await httPromise(
          appUrl + '/skip',
          'POST',
          {},
          {
            skipBy: 'class',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).not.toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('POST /skip: should not skip by the root option', async () => {
        const response = await httPromise(
          appUrl + '/skip',
          'POST',
          {},
          {
            skipBy: 'root',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('POST /skip/skip-by-root-option: should skip by the root option', async () => {
        const response = await httPromise(
          appUrl + '/skip/skip-by-root-option',
          'POST',
          {},
          {
            skipBy: 'root',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).not.toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('POST /skip/dont-skip-at-all: root', async () => {
        const response = await httPromise(
          appUrl + '/skip/dont-skip-at-all',
          'POST',
          {},
          {
            skipBy: 'root',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('POST /skip/dont-skip-at-all: class', async () => {
        const response = await httPromise(
          appUrl + '/skip/dont-skip-at-all',
          'POST',
          {},
          {
            skipBy: 'class',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('POST /skip/skip-method: should skip', async () => {
        const response = await httPromise(
          appUrl + '/skip/skip-method',
          'POST',
          {},
          {
            skipBy: 'method',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).not.toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
      it('POST /skip/skip-method: should not skip by the class option', async () => {
        const response = await httPromise(
          appUrl + '/skip/skip-method',
          'POST',
          {},
          {
            skipBy: 'class',
          },
        );
        expect(response.data).toEqual({ ignored: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /\d+/,
        });
      });
    });
  });
});
