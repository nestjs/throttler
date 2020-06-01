import { INestApplication, RequestMethod } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app/app.module';
import { httPromise } from './utility/httpromise';
//${new FastifyAdapter()} | ${'Fastify'}

describe.each`
  adapter                 | adapterName
  ${new ExpressAdapter()} | ${'Express'}
`('$adapterName Throttler', ({ adapter }: { adapter: AbstractHttpAdapter }) => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule.forRoot({
          excludeRoutes: [
            'ignored',
            { path: 'ignored-2', method: RequestMethod.POST },
            { path: 'ignored-3', method: RequestMethod.ALL },
            { path: 'ignored/:foo', method: RequestMethod.GET },
          ],
        }),
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
    // ${'/ignored'}           | ${'GET'}
    // ${'/ignored-2'}         | ${'POST'}
    // ${'/ignored/something'} | ${'GET'}
    describe('AppController', () => {
      it.each`
        url             | method
        ${'/ignored-3'} | ${'PATCH'}
      `(
        'ignore $method $url',
        async ({ url, method }: { url: string; method: 'GET' | 'POST' | 'PATCH' }) => {
          const response = await httPromise(appUrl + url, method, {});
          expect(response.data).toEqual({ ignored: true });
          expect(response.headers).not.toMatchObject({
            'x-ratelimit-limit': '2',
            'x-ratelimit-remaining': '1',
            'x-ratelimit-reset': /\d+/,
          });
        },
      );
      it('GET /', async () => {
        const response = await httPromise(appUrl + '/', 'GET', {});
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
    describe('ThrottlerController', () => {
      it.each`
        method   | url          | limit
        ${'GET'} | ${''}        | ${2}
        ${'GET'} | ${'/higher'} | ${5}
      `(
        '$method $url',
        async ({ method, url, limit }: { method: 'GET'; url: string; limit: number }) => {
          const response = await httPromise(appUrl + '/throttle' + url, method);
          expect(response.data).toEqual({ success: true });
          expect(response.headers).toMatchObject({
            'x-ratelimit-limit': limit.toString(),
            'x-ratelimit-remaining': (limit - 1).toString(),
            'x-ratelimit-reset': /\d+/,
          });
        },
      );
    });
    /**
     * Tests for setting throttle values at the `forRoot` level
     */
    describe('DefaultController', () => {
      it.todo('Implement tests for the DefaultController');
    });
    /**
     * Tests for getting a 429 back when we've hit the limit
     */
    describe('LimitController', () => {
      it.todo('Implement tests for the LimitController');
    });
  });
});
