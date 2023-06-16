import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ThrottlerGuard,
  ThrottlerStorage,
  ThrottlerStorageMemoryService,
  ThrottlerStorageMongoService,
  ThrottlerStorageRedisService,
} from '../src';
import { THROTTLER_OPTIONS } from '../src/throttler.constants';
import { ControllerModule } from './app/controllers/controller.module';
import { httPromise } from './utility/httpromise';
import Redis, { Cluster } from 'ioredis';
import { mongoURL, mongoDB, mongoCollectionName } from './utility/mongo';
import { redis } from './utility/redis';
import { MongoClient, Collection } from 'mongodb';

async function flushdb(redisOrCluster: Redis | Cluster) {
  if (redisOrCluster instanceof Redis) {
    await redisOrCluster.flushall();
  } else {
    // cluster instance
    await Promise.all(
      redisOrCluster.nodes('master').map(function (node) {
        return node.flushall();
      }),
    );
  }
}

async function dropCollectionAndCreateIndex(
  dbUrl: string,
  dbName: string,
  collectionName: string,
): Promise<void> {
  const client = new MongoClient(dbUrl);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection: Collection = db.collection(collectionName);
    if (collection) {
      // Drop the collection
      await collection.drop();

      // Create an index on the specified field
      // await collection.createIndex({ [indexField]: 1 });
    }
  } finally {
    await client.close();
  }
}
const storageServices = ['Memory', 'Redis', 'MongoDB'];
const adapters = ['Express', 'Fastify'];
for (const storageName of storageServices) {
  for (const adapterName of adapters) {
    describe(`${adapterName} Throttler ${storageName}`, () => {
      let app: INestApplication;
      let storageService;

      beforeAll(async () => {
        if (storageName === 'Redis') {
          storageService = await new ThrottlerStorageRedisService(new Redis(redis));
          await flushdb(new Redis(redis));
        } else if (storageName === 'MongoDB') {
          await dropCollectionAndCreateIndex(mongoURL, mongoDB, mongoCollectionName);
          storageService = await new ThrottlerStorageMongoService(mongoURL);
        } else {
          storageService = await new ThrottlerStorageMemoryService();
        }
        const moduleFixture: TestingModule = await Test.createTestingModule({
          imports: [ControllerModule],
          providers: [
            {
              provide: APP_GUARD,
              useClass: ThrottlerGuard,
            },
            {
              provide: ThrottlerStorage,
              useValue: storageService,
            },
          ],
        }).compile();
        const adpater = adapterName === 'Express' ? new ExpressAdapter() : new FastifyAdapter();
        app = moduleFixture.createNestApplication(adpater);
        await app.listen(0);
      });

      afterAll(async () => {
        if (app) await app.close();
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
              'x-ratelimit-limit-minute': '6',
              'x-ratelimit-remaining-minute': '5',
              'x-ratelimit-reset-minute': /^\d+$/,
            });
          });
          it('GET /ignore-user-agents', async () => {
            const response = await httPromise(appUrl + '/ignore-user-agents', 'GET', {
              'user-agent': 'throttler-test/0.0.0',
            });
            expect(response.data).toEqual({ ignored: true });
            expect(response.headers).not.toMatchObject({
              'x-ratelimit-limit-minute': '6',
              'x-ratelimit-remaining-minute': '5',
              'x-ratelimit-reset-minute': /^\d+$/,
            });
          });
          it('GET /', async () => {
            const response = await httPromise(appUrl + '/');
            expect(response.data).toEqual({ success: true });
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit-minute': '6',
              'x-ratelimit-remaining-minute': '5',
              'x-ratelimit-reset-minute': /^\d+$/,
            });
          });
          it('GET /custom 1st call', async () => {
            const response = await httPromise(appUrl + '/custom');
            expect(response.data).toEqual({ success: true });
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit-20': '3',
              'x-ratelimit-remaining-20': '2',
              'x-ratelimit-reset-20': /^\d+$/,
            });
          });
          it('GET /custom 2nd call', async () => {
            const response = await httPromise(appUrl + '/custom');
            expect(response.data).toEqual({ success: true });
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit-20': '3',
              'x-ratelimit-remaining-20': '1',
              'x-ratelimit-reset-20': /^\d+$/,
            });
          });
          it('GET /custom 3rd call', async () => {
            const response = await httPromise(appUrl + '/custom');
            expect(response.data).toEqual({ success: true });
            expect(response.headers).toMatchObject({
              'x-ratelimit-limit-20': '3',
              'x-ratelimit-remaining-20': '0',
              'x-ratelimit-reset-20': /^\d+$/,
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
            ${'GET'} | ${'/higher'} | ${10}
          `(
            '$method $url',
            async ({ method, url, limit }: { method: 'GET'; url: string; limit: number }) => {
              for (let i = 0; i < limit; i++) {
                const response = await httPromise(appUrl + '/limit' + url, method);
                expect(response.data).toEqual({ success: true });
                expect(response.headers).toMatchObject({
                  'x-ratelimit-limit-minute': limit.toString(),
                  'x-ratelimit-remaining-minute': (limit - (i + 1)).toString(),
                  'x-ratelimit-reset-minute': /^\d+$/,
                });
              }
              const errRes = await httPromise(appUrl + '/limit' + url, method);
              expect(errRes.data).toMatchObject({ statusCode: 429, message: /ThrottlerException/ });
              expect(errRes.headers).toMatchObject({
                'retry-after': /^\d+$/,
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
              'x-ratelimit-limit-minute': '5',
              'x-ratelimit-remaining-minute': '4',
              'x-ratelimit-reset-minute': /^\d+$/,
            });
          });
        });
      });
    });
  }
}

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
      .useValue({
        skipIf: () => true,
        limits: [{ timeUnit: 'minute', limit: 5 }],
        storage: new ThrottlerStorageRedisService(),
      })
      .compile();

    const app = moduleFixture.createNestApplication();
    await app.listen(0);
    const appUrl = await app.getUrl();
    for (let i = 0; i < 15; i++) {
      const response = await httPromise(appUrl + '/');
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
      expect(response.headers).not.toMatchObject({
        'x-ratelimit-limit-minute': '5',
        'x-ratelimit-remaining-minute': '4',
        'x-ratelimit-reset-minute': /^\d+$/,
      });
    }
    await app.close();
  });
});
