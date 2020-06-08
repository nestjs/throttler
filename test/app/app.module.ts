import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '../../src';
import { ControllerModule } from './controllers/controller.module';
import { GatewayModule } from './gateways/gateway.module';
import { ResolverModule } from './resolvers/resolver.module';

@Module({
  imports: [ControllerModule, GatewayModule, ResolverModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
