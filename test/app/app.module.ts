import { Module } from '@nestjs/common';
import { ControllerModule } from './controllers/controller.module';
import { GatewayModule } from './gateways/gateway.module';
import { ResolverModule } from './resolvers/resolver.module';

@Module({
  imports: [ControllerModule, GatewayModule, ResolverModule],
})
export class AppModule {}
