import { INestApplication } from '@nestjs/common';
import { AbstractHttpAdapter, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ExpressAdapter } from '@nestjs/platform-express';
// import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '../src';
import { ResolverModule } from './app/resolvers/resolver.module';
import { httPromise } from './utility/httpromise';

const factories = {
  query: (prefix: string): Record<string, any> => {
    return {
      query: `query ${prefix}Query{ ${prefix}Query{ success }}`,
    };
  },
  mutation: (prefix: string): Record<string, any> => {
    return {
      query: `mutation ${prefix}Mutation{ ${prefix}Mutation{ success }}`,
    };
  },
  data: (prefix: string, type: string): Record<string, any> => {
    type = type[0].toUpperCase() + type.substring(1, type.length);
    return {
      data: {
        [prefix + type]: {
          success: true,
        },
      },
    };
  },
};

// ${new FastifyAdapter()} | ${'Fastify'} | ${() => ({})}
describe.each`
  adapter                 | adapterName  | context
  ${new ExpressAdapter()} | ${'Express'} | ${({ req, res }) => ({ req, res })}
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
        it.each`
          type
          ${'query'}
          ${'mutation'}
        `('$type', async ({ type }: { type: string }) => {
          const res = await httPromise(appUrl, 'POST', {}, factories[type]('app'));
          expect(res.data).toEqual(factories.data('app', type));
          expect(res.headers).toMatchObject({
            'x-ratelimit-limit': '2',
            'x-ratelimit-remaining': '1',
            'x-ratelimit-reset': /\d+/,
          });
        });
      });
      /**
       * Tests for setting `@Throttle()` at the class level and overriding at the method level
       */
      describe('LimitResolver', () => {
        it.each`
          type          | limit
          ${'query'}    | ${5}
          ${'mutation'} | ${2}
        `('$type', async ({ type, limit }: { type: string; limit: number }) => {
          for (let i = 0; i < limit; i++) {
            const res = await httPromise(appUrl, 'POST', {}, factories[type]('limit'));
            expect(res.data).toEqual(factories.data('limit', type));
            expect(res.headers).toMatchObject({
              'x-ratelimit-limit': limit.toString(),
              'x-ratelimit-remaining': (limit - (i + 1)).toString(),
              'x-ratelimit-reset': /\d+/,
            });
          }
          const errRes = await httPromise(appUrl, 'POST', {}, factories[type]('limit'));
          expect(errRes.data).not.toEqual(factories.data('limit', type));
          expect(errRes.data.errors[0].message).toBe('ThrottlerException: Too Many Requests');
          expect(errRes.headers).toMatchObject({
            'retry-after': /\d+/,
          });
          expect(errRes.status).toBe(200);
        });
      });
      /**
       * Tests for setting throttle values at the `forRoot` level
       */
      describe('DefaultResolver', () => {
        it.each`
          type
          ${'query'}
          ${'mutation'}
        `('$type', async ({ type }: { type: string }) => {
          const res = await httPromise(appUrl, 'POST', {}, factories[type]('default'));
          expect(res.data).toEqual(factories.data('default', type));
          expect(res.headers).toMatchObject({
            'x-ratelimit-limit': '5',
            'x-ratelimit-remaining': '4',
            'x-ratelimit-reset': /\d+/,
          });
        });
      });
    });
  },
);
