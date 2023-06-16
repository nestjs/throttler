import { Module } from '@nestjs/common';
import {
  ThrottlerModule,
  // ThrottlerStorageMemoryService,
  // ThrottlerStorageMongoService,
  // ThrottlerStorageRedisService,
} from '../../../src';
import { AppService } from '../app.service';
import { AppController } from './app.controller';
import { DefaultController } from './default.controller';
import { LimitController } from './limit.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      limits: [{ timeUnit: 'minute', limit: 5 }],
      //storage: new ThrottlerStorageRedisService('redis://localhost:6379'),
      //storage: new ThrottlerStorageMemoryService(),// -- default
      //storage: new ThrottlerStorageMongoService('mongodb://localhost:27017'),

      ignoreUserAgents: [/throttler-test/g],
    }),
  ],
  controllers: [AppController, DefaultController, LimitController],
  providers: [AppService],
})
export class ControllerModule {}
