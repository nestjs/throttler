import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '../../src';
import { CustomErrorMessageController } from './custom-error-message.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      errorMessage: (context, throttlerLimitDetail) =>
        `${context.getClass().name}-${
          context.getHandler().name
        } ${throttlerLimitDetail.tracker} ${throttlerLimitDetail.totalHits}`,
      throttlers: [
        {
          name: 'default',
          ttl: seconds(3),
          limit: 2,
        },
        {
          name: 'other',
          ttl: seconds(3),
          limit: 2,
        },
      ],
    }),
  ],
  controllers: [CustomErrorMessageController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class CustomErrorMessageThrottlerModule {}
