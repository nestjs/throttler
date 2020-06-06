import { AsyncModuleConfig } from '@golevelup/nestjs-modules';
import { Module } from '@nestjs/common';
import { ThrottlerCoreModule } from './throttler-core.module';
import { ThrottlerOptions } from './throttler.interface';

@Module({})
export class ThrottlerModule {
  /**
   * Register the module synchronously.
   */
  static forRoot(options?: ThrottlerOptions) {
    return ThrottlerCoreModule.forRoot(ThrottlerCoreModule, options);
  }

  /**
   * Register the module asynchronously.
   */
  static forRootAsync(options?: AsyncModuleConfig<ThrottlerOptions>) {
    return ThrottlerCoreModule.forRootAsync(ThrottlerCoreModule, options);
  }
}
