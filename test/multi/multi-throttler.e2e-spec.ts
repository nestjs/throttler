import { INestApplication, Type } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { setTimeout } from 'node:timers/promises';
import { request, spec } from 'pactum';
import { MultiThrottlerAppModule } from './app.module';

jest.setTimeout(10000);

const commonHeader = (prefix: string, name?: string) => `${prefix}${name ? '-' + name : ''}`;

const remainingHeader = (name?: string) => commonHeader('x-ratelimit-remaining', name);
const limitHeader = (name?: string) => commonHeader('x-ratelimit-limit', name);
const retryHeader = (name?: string) => commonHeader('retry-after', name);

const short = 'short';
const long = 'long';

describe.each`
  adapter           | name
  ${ExpressAdapter} | ${'express'}
  ${FastifyAdapter} | ${'fastify'}
`('Mutli-Throttler Named Usage - $name', ({ adapter }: { adapter: Type<AbstractHttpAdapter> }) => {
  let app: INestApplication;
  beforeAll(async () => {
    const modRef = await Test.createTestingModule({
      imports: [MultiThrottlerAppModule],
    }).compile();
    app = modRef.createNestApplication(new adapter());
    await app.listen(0);
    request.setBaseUrl(await app.getUrl());
  });
  afterAll(async () => {
    await app.close();
  });

  describe('Default Route: 1/s, 2/5s, 5/min', () => {
    it('should receive an exception when firing 2 request swithin a second', async () => {
      await spec()
        .get('/')
        .expectStatus(200)
        .expectHeader(remainingHeader(short), '0')
        .expectHeader(limitHeader(short), '1');
      await spec().get('/').expectStatus(429).expectHeaderContains(retryHeader(short), /^\d+$/);
      await setTimeout(1000);
    });
    it('should get an error if we send two more requests within the first five seconds', async () => {
      await spec()
        .get('/')
        .expectStatus(200)
        .expectHeader(remainingHeader(), '0')
        .expectHeader(limitHeader(), '2');
      await setTimeout(1000);
      await spec().get('/').expectStatus(429).expectHeaderContains(retryHeader(), /^\d+$/);
      await setTimeout(5000);
    });
    it('should get an error if we smartly send 4 more requests within the minute', async () => {
      await spec()
        .get('/')
        .expectStatus(200)
        .expectHeader(limitHeader(long), '5')
        .expectHeader(remainingHeader(long), '2')
        .expectHeader(remainingHeader(short), '0');
      await setTimeout(1000);
      await spec().get('/').expectStatus(200).expectHeader(remainingHeader(), '0');
      console.log('waiting 5 seconds');
      await setTimeout(5000);
      await spec()
        .get('/')
        .expectStatus(200)
        .expectHeader(remainingHeader(long), '0')
        .expectHeader(remainingHeader(short), '0')
        .expectHeader(remainingHeader(), '1');
      await setTimeout(1000);
      await spec().get('/').expectStatus(429).expectHeaderContains(retryHeader(long), /^\d+$/);
    });
  });
  describe('skips', () => {
    it('should skip theshort throttler', async () => {
      await spec().get('/skip-short').expectStatus(200).expectHeader(remainingHeader(), '1');
      await spec().get('/skip-short').expectStatus(200).expectHeader(remainingHeader(), '0');
    });
    it('should skip the default and long trackers', async () => {
      await spec()
        .get('/skip-default-and-long')
        .expectStatus(200)
        .expectHeader(remainingHeader(short), '0');
    });
  });
});
