import { ExecutionContext, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '../../src';
import { FunctionOverridesThrottlerController } from './funciton-overrides-throttler.controller';
import md5 = require('md5');

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
        getTracker: (req) => req.ip,
        generateKey: (context: ExecutionContext, trackerString: string, throttlerName: string) => {
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
