import { AsyncModuleConfig } from '@golevelup/nestjs-modules';
import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerCoreModule } from './throttler-core.module';
import { ThrottlerGuard } from './throttler.guard';
import { ThrottlerOptions } from './throttler.interface';
import { ThrottlerStorageService } from './throttler.service';

@Global()
@Module({
  imports: [ThrottlerStorageService],
  providers: [
    ThrottlerStorageService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerStorageService, ThrottlerGuard],
})
export class ThrottlerModule {
  static forRoot(options?: ThrottlerOptions) {
    return ThrottlerCoreModule.forRoot(ThrottlerCoreModule, options);
  }

  static forRootAsync(options?: AsyncModuleConfig<ThrottlerOptions>) {
    return ThrottlerCoreModule.forRootAsync(ThrottlerCoreModule, options);
  }
}
