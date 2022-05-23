import { Module } from '@nestjs/common';
import { ThrottlerModule } from '../../../src';
import { AppService } from '../app.service';
import { AppController } from './app.controller';
import { DefaultController } from './default.controller';
import { SkipController } from './skip.controller';
import { LimitController } from './limit.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      limit: 5,
      ttl: 60,
      ignoreUserAgents: [/throttler-test/g],
      skip: (context, req, res) => req.body && req.body.skipBy === 'root',
    }),
  ],
  controllers: [AppController, DefaultController, LimitController, SkipController],
  providers: [AppService],
})
export class ControllerModule {}
