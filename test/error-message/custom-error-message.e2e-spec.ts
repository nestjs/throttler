import { INestApplication, Type } from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { request, spec } from 'pactum';
import { CustomErrorMessageThrottlerModule } from './app.module';

jest.setTimeout(10000);

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
        imports: [CustomErrorMessageThrottlerModule],
      }).compile();
      app = modRef.createNestApplication(new adapter());
      await app.listen(0);
      request.setBaseUrl(await app.getUrl());
    });
    afterAll(async () => {
      await app.close();
    });

    describe.each`
      route        | errorMessage
      ${'default'} | ${'CustomErrorMessageController-defaultRoute ::1 3'}
      ${'other'}   | ${'CustomErrorMessageController-otherRoute ::1 3'}
    `(
      'Custom-error-message Route - $route',
      ({ route, errorMessage }: { route: string; errorMessage: string }) => {
        it('should receive a custom exception', async () => {
          const limit = 2;
          for (let i = 0; i < limit; i++) {
            await spec().get(`/${route}`).expectStatus(200);
          }

          await spec().get(`/${route}`).expectStatus(429).expectBodyContains(errorMessage);
        });
      },
    );
  },
);
