import { ExecutionContext, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '../../src';
import { FunctionOverridesThrottlerController } from './function-overrides-throttler.controller';
import { md5 } from '../utility/hash';
import assert = require('assert');

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: seconds(3),
        limit: 2,
      },
      {
        name: 'custom',
        ttl: seconds(3),
        limit: 2,
        getTracker: () => 'customTrackerString',
        generateKey: (context: ExecutionContext, trackerString: string, throttlerName: string) => {
          // check if tracker string is passed correctly
          assert(trackerString === 'customTrackerString');
          // use the same key for all endpoints
          return md5(`${throttlerName}-${trackerString}`);
        },
      },
    ]),
  ],
  controllers: [FunctionOverridesThrottlerController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class FunctionOverridesThrottlerModule {}
