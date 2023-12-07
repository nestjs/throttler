import { INestApplication, Type } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { setTimeout } from 'node:timers/promises';
import { request, spec } from 'pactum';
import { FunctionOverridesThrottlerModule } from './app.module';

jest.setTimeout(10000);

const commonHeader = (prefix: string, name?: string) => `${prefix}${name ? '-' + name : ''}`;

const remainingHeader = (name?: string) => commonHeader('x-ratelimit-remaining', name);
const limitHeader = (name?: string) => commonHeader('x-ratelimit-limit', name);
const retryHeader = (name?: string) => commonHeader('retry-after', name);

const custom = 'custom';

describe.each`
  adapter           | name
  ${ExpressAdapter} | ${'express'}
  ${FastifyAdapter} | ${'fastify'}
`(
  'Function-Overrides-Throttler Named Usage - $name',
  ({ adapter }: { adapter: Type<AbstractHttpAdapter> }) => {
    let app: INestApplication;
    beforeAll(async () => {
      const modRef = await Test.createTestingModule({
        imports: [FunctionOverridesThrottlerModule],
      }).compile();
      app = modRef.createNestApplication(new adapter());
      await app.listen(0);
      request.setBaseUrl(await app.getUrl());
    });
    afterAll(async () => {
      await app.close();
    });

    describe('Default Routes', () => {
      it('should receive an exception when firing 3 requests within 3 seconds to the same endpoint', async () => {
        await spec()
          .get('/')
          .expectStatus(200)
          .expectHeader(remainingHeader(), '1')
          .expectHeader(limitHeader(), '2');
        await spec()
          .get('/1')
          .expectStatus(200)
          .expectHeader(remainingHeader(), '1')
          .expectHeader(limitHeader(), '2');
        await spec().get('/').expectStatus(200).expectHeaderContains(remainingHeader(), '0');
        await spec().get('/').expectStatus(429).expectHeaderContains(retryHeader(), /^\d+$/);
        await spec().get('/1').expectStatus(200).expectHeaderContains(remainingHeader(), '0');
        await spec().get('/').expectStatus(429).expectHeaderContains(retryHeader(), /^\d+$/);
        await setTimeout(3000);
        await spec()
          .get('/')
          .expectStatus(200)
          .expectHeader(remainingHeader(), '1')
          .expectHeader(limitHeader(), '2');
      });
    });

    describe('Custom Routes', () => {
      it('should receive an exception when firing 3 requests within 3 seconds to any endpoint', async () => {
        await spec()
          .get('/custom')
          .expectStatus(200)
          .expectHeader(remainingHeader(custom), '1')
          .expectHeader(limitHeader(custom), '2');
        await spec()
          .get('/custom/1')
          .expectStatus(200)
          .expectHeader(remainingHeader(custom), '0')
          .expectHeader(limitHeader(custom), '2');
        await spec()
          .get('/custom')
          .expectStatus(429)
          .expectHeaderContains(retryHeader(custom), /^\d+$/);
        await spec()
          .get('/custom/1')
          .expectStatus(429)
          .expectHeaderContains(retryHeader(custom), /^\d+$/);
        await setTimeout(3000);
        await spec()
          .get('/custom')
          .expectStatus(200)
          .expectHeader(remainingHeader(custom), '1')
          .expectHeader(limitHeader(custom), '2');
        await spec()
          .get('/custom/1')
          .expectStatus(200)
          .expectHeader(remainingHeader(custom), '0')
          .expectHeader(limitHeader(custom), '2');
      });
    });
  },
);
