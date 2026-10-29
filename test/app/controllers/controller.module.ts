import { Module } from '@nestjs/common';
import { ThrottlerModule, seconds } from '../../../src/index.js';
import { AppService } from '../app.service.js';
import { AppController } from './app.controller.js';
import { DefaultController } from './default.controller.js';
import { LimitController } from './limit.controller.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        limit: 5,
        ttl: seconds(60),
        blockDuration: seconds(20),
        ignoreUserAgents: [/throttler-test/g],
      },
    ]),
  ],
  controllers: [AppController, DefaultController, LimitController],
  providers: [AppService],
})
export class ControllerModule {}
