import { INestApplication } from '@nestjs/common';
import { AbstractHttpAdapter, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '../src';
import { ResolverModule } from './app/resolvers/resolver.module';
import { httPromise } from './utility/httpromise';

function queryFactory(prefix: string): Record<string, any> {
  return {
    query: `query ${prefix}Query{ ${prefix}Query{ success }}`,
  };
}

function mutationFactory(prefix: string): Record<string, any> {
  return {
    query: `mutation ${prefix}Mutation{ ${prefix}Mutation{ success }}`,
  };
}

describe.each`
  adapter                 | adapterName  | context
  ${new ExpressAdapter()} | ${'Express'} | ${({ req, res }) => ({ req, res })}
  ${new FastifyAdapter()} | ${'Fastify'} | ${({}) => ({})}
`(
  '$adapterName Throttler',
  ({ adapter, context }: { adapter: AbstractHttpAdapter; context: () => any }) => {
    let app: INestApplication;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ResolverModule,
          GraphQLModule.forRoot({
            autoSchemaFile: true,
            context,
          }),
        ],
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

    describe('Resolvers', () => {
      let appUrl: string;
      beforeAll(async () => {
        appUrl = (await app.getUrl()) + '/graphql';
      });

      /**
       * Tests for setting `@Throttle()` at the method level and for ignore routes
       */
      describe('AppResolver', () => {
        it.todo('Implement AppResolver tests');
        it.each`
          type
          ${'query'}
          ${'mutation'}
        `('$type', async ({ type }: { type: string }) => {
          const res = await httPromise(
            appUrl,
            'POST',
            {},
            type === 'query' ? queryFactory('app') : mutationFactory('app'),
          );
          expect(res).toEqual({ success: true });
        });
      });
      /**
       * Tests for setting `@Throttle()` at the class level and overriding at the method level
       */
      describe('LimitResolver', () => {
        it.todo('Implement LimitResolver test');
      });
      /**
       * Tests for setting throttle values at the `forRoot` level
       */
      describe('DefaultResolver', () => {
        it.todo('implement DefaultResolver Test');
      });
    });
  },
);
