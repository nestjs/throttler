import { Module } from '@nestjs/common';
import { ThrottlerModule } from '../../../src';
import { AppService } from '../app.service';
import { AppGateway } from './app.gateway';
import { DefaultGateway } from './default.gateway';
import { LimitGateway } from './limit.gateway';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      limit: 5,
      ttl: 60,
    }),
  ],
  providers: [AppGateway, AppService, DefaultGateway, LimitGateway],
})
export class GatewayModule {}
