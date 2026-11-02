import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  Module,
  Scope,
  Type,
  UseGuards,
} from '@nestjs/common';
import { AbstractHttpAdapter } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { request, spec } from 'pactum';
import { ThrottlerGuard, ThrottlerModule } from '../../src';

@Injectable({ scope: Scope.REQUEST })
class RequestScopedGuard extends ThrottlerGuard {}

@Controller()
class RequestScopedController {
  @UseGuards(RequestScopedGuard)
  @Get()
  get() {
    return 'ok';
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 1 }])],
  controllers: [RequestScopedController],
})
class RequestScopedModule {}

describe.each`
  adapter           | name
  ${ExpressAdapter} | ${'express'}
  ${FastifyAdapter} | ${'fastify'}
`('Request-scoped guard - $name', ({ adapter }: { adapter: Type<AbstractHttpAdapter> }) => {
  let app: INestApplication;

  beforeAll(async () => {
    const modRef = await Test.createTestingModule({
      imports: [RequestScopedModule],
    }).compile();
    app = modRef.createNestApplication(new adapter());
    await app.listen(0);
    request.setBaseUrl(await app.getUrl());
  });

  afterAll(async () => {
    await app.close();
  });

  it('should apply the limit, which is shared between the guard instances', async () => {
    await spec().get('/').expectStatus(200);
    await spec().get('/').expectStatus(429);
  });
});
