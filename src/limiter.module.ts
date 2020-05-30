import { AsyncModuleConfig } from '@golevelup/nestjs-modules';
import { Global, Module } from '@nestjs/common';
import { LimiterCoreModule } from './limiter-core.module';
import { LimiterOptions } from './limiter.interface';

@Global()
@Module({})
export class LimiterModule {
  static forRoot(options?: LimiterOptions) {
    return LimiterCoreModule.forRoot(LimiterCoreModule, options);
  }

  static forRootAsync(options?: AsyncModuleConfig<LimiterOptions>) {
    return LimiterCoreModule.forRootAsync(LimiterCoreModule, options);
  }
}
