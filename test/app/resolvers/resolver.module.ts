import { Module } from '@nestjs/common';
import { ThrottlerModule } from '../../../src';
import { AppResolver } from './app.resolver';
import { DefaultResolver } from './default.resolver';
import { LimitResolver } from './limit.resolver';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      limit: 5,
      ttl: 60,
    }),
  ],
  providers: [AppResolver, DefaultResolver, LimitResolver],
})
export class ResolverModule {}
