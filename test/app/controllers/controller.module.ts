import { Module } from '@nestjs/common';
import { ThrottlerModule } from '../../../src';
import { AppController } from './app.controller';
import { DefaultController } from './default.controller';
import { LimitController } from './limit.controller';
import { AppService } from '../app.service';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      limit: 5,
      ttl: 60,
    }),
  ],
  controllers: [AppController, DefaultController, LimitController],
  providers: [AppService],
})
export class ControllerModule {}
