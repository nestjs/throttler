import { createConfigurableDynamicRootModule } from '@golevelup/nestjs-modules';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { THROTTLER_OPTIONS } from './throttler.constants';
import { ThrottlerGuard } from './throttler.guard';
import { ThrottlerOptions } from './throttler.interface';
import { ThrottlerStorageService } from './throttler.service';
import { ThrottlerStorage } from './throttler-storage.interface';

@Module({})
export class ThrottlerCoreModule extends createConfigurableDynamicRootModule<
  ThrottlerCoreModule,
  ThrottlerOptions
>(THROTTLER_OPTIONS, {
  providers: [
    {
      provide: ThrottlerStorage,
      inject: [THROTTLER_OPTIONS],
      useFactory: (options: ThrottlerOptions) => {
        return options.storage ? options.storage : new ThrottlerStorageService();
      },
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
}) {}
