import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '../../../src';
import { AppService } from '../app.service';
import { AppController } from './app.controller';
import { DefaultController } from './default.controller';
import { LimitController } from './limit.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        limit: 5,
        ttl: seconds(60),
        ignoreUserAgents: [/throttler-test/g],
      },
    ]),
  ],
  controllers: [AppController, DefaultController, LimitController],
  providers: [AppService],
})
export class ControllerModule {}
