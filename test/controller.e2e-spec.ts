import { INestApplication } from '@nestjs/common';
import { AbstractHttpAdapter, APP_GUARD } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '../src';
import { THROTTLER_OPTIONS } from '../src/throttler.constants';
import { ControllerModule } from './app/controllers/controller.module';
import { httPromise } from './utility/httpromise';
import { setTimeout } from 'node:timers/promises';

jest.setTimeout(45000);

describe.each`
  adapter                 | adapterName
  ${new ExpressAdapter()} | ${'Express'}
  ${new FastifyAdapter()} | ${'Fastify'}
`('$adapterName Throttler', ({ adapter }: { adapter: AbstractHttpAdapter }) => {
  let app: INestApplication;

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
          'x-ratelimit-reset': /^\d+$/,
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
          'x-ratelimit-reset': /^\d+$/,
        });
      });
      it('GET /', async () => {
        const response = await httPromise(appUrl + '/');
        expect(response.data).toEqual({ success: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': '2',
          'x-ratelimit-remaining': '1',
          'x-ratelimit-reset': /^\d+$/,
        });
      });
    });
    /**
     * Tests for setting `@Throttle()` at the class level and overriding at the method level
     */
    describe('LimitController', () => {
      it.each`
        method   | url          | limit | blockDuration
        ${'GET'} | ${''}        | ${2}  | ${5000}
        ${'GET'} | ${'/higher'} | ${5}  | ${15000}
      `(
        '$method $url',
        async ({
          method,
          url,
          limit,
          blockDuration,
        }: {
          method: 'GET';
          url: string;
          limit: number;
          blockDuration: number;
        }) => {
          for (let i = 0; i < limit; i++) {
            const response = await httPromise(appUrl + '/limit' + url, method);
            expect(response.data).toEqual({ success: true });
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit': limit.toString(),
              'x-ratelimit-remaining': (limit - (i + 1)).toString(),
              'x-ratelimit-reset': /^\d+$/,
            });
          }
          const errRes = await httPromise(appUrl + '/limit' + url, method);
          expect(errRes.data).toMatchObject({ statusCode: 429, message: /ThrottlerException/ });
          expect(errRes.headers).toMatchObject({
            'retry-after': /^\d+$/,
          });
          expect(errRes.status).toBe(429);
          console.log(`waiting ${blockDuration / 1000} seconds`);
          await setTimeout(blockDuration);
          const response = await httPromise(appUrl + '/limit' + url, method);
          expect(response.data).toEqual({ success: true });
          expect(response.headers).toMatchObject({
            'x-ratelimit-limit': limit.toString(),
            'x-ratelimit-remaining': (limit - 1).toString(),
            'x-ratelimit-reset': /^\d+$/,
          });
        },
      );
    });
    /**
     * Tests for setting throttle values at the `forRoot` level
     */
    describe('DefaultController', () => {
      it('GET /default', async () => {
        const limit = 5;
        const blockDuration = 20000; // 20 second
        for (let i = 0; i < limit; i++) {
          const response = await httPromise(appUrl + '/default');
          expect(response.data).toEqual({ success: true });
          expect(response.headers).toMatchObject({
            'x-ratelimit-limit': limit.toString(),
            'x-ratelimit-remaining': (limit - (i + 1)).toString(),
            'x-ratelimit-reset': /^\d+$/,
          });
        }
        const errRes = await httPromise(appUrl + '/default');
        expect(errRes.data).toMatchObject({ statusCode: 429, message: /ThrottlerException/ });
        expect(errRes.headers).toMatchObject({
          'retry-after': /^\d+$/,
        });
        expect(errRes.status).toBe(429);
        await setTimeout(blockDuration);
        const response = await httPromise(appUrl + '/default');
        expect(response.data).toEqual({ success: true });
        expect(response.headers).toMatchObject({
          'x-ratelimit-limit': limit.toString(),
          'x-ratelimit-remaining': (limit - 1).toString(),
          'x-ratelimit-reset': /^\d+$/,
        });
      });
    });
  });
});
describe('SkipIf suite', () => {
  it('should skip throttling if skipIf returns true', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ControllerModule],
      providers: [
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    })
      .overrideProvider(THROTTLER_OPTIONS)
      .useValue([
        {
          skipIf: () => true,
          limit: 5,
        },
      ])
      .compile();

    const app = moduleFixture.createNestApplication();
    await app.listen(0);
    const appUrl = await app.getUrl();
    for (let i = 0; i < 15; i++) {
      const response = await httPromise(appUrl + '/');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
      expect(response.headers).not.toMatchObject({
        'x-ratelimit-limit': '5',
        'x-ratelimit-remaining': '4',
        'x-ratelimit-reset': /^\d+$/,
      });
    }
    await app.close();
  });
});
