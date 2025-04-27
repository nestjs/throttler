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
        name: 'low',
        limit: 3,
        ttl: seconds(60),
      },
      {
        name: 'medium',
        limit: 6,
        ttl: seconds(120),
      },
      {
        name: 'high',
        limit: 9,
        ttl: seconds(180),
      },
    ]),
  ],
  controllers: [AppController, DefaultController, LimitController],
  providers: [AppService],
})
export class ControllerModule {}
