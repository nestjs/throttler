import { AsyncModuleConfig } from '@golevelup/nestjs-modules';
import { Global, Module } from '@nestjs/common';
import { ThrottlerCoreModule } from './throttler-core.module';
import { ThrottlerOptions } from './throttler.interface';

@Module({})
export class ThrottlerModule {
  static forRoot(options?: ThrottlerOptions) {
    return ThrottlerCoreModule.forRoot(ThrottlerCoreModule, options);
  }

  static forRootAsync(options?: AsyncModuleConfig<ThrottlerOptions>) {
    return ThrottlerCoreModule.forRootAsync(ThrottlerCoreModule, options);
  }
}
