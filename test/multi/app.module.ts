import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds, minutes } from '../../src';
import { MultiThrottlerController } from './multi-throttler.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: seconds(5),
        limit: 2,
      },
      {
        name: 'long',
        ttl: minutes(1),
        limit: 5,
      },
      {
        name: 'short',
        limit: 1,
        ttl: seconds(1),
      },
    ]),
  ],
  controllers: [MultiThrottlerController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class MultiThrottlerAppModule {}
