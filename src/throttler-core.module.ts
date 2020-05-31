import { createConfigurableDynamicRootModule } from '@golevelup/nestjs-modules';
import { Module } from '@nestjs/common';
import { THROTTLER_OPTIONS } from './throttler.constants';
import { ThrottlerOptions } from './throttler.interface';
import { ThrottlerStorageService } from './throttler.service';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from './throttler.guard';

@Module({})
export class ThrottlerCoreModule extends createConfigurableDynamicRootModule<
  ThrottlerCoreModule,
  ThrottlerOptions
>(THROTTLER_OPTIONS, {
  providers: [
    ThrottlerStorageService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [ThrottlerStorageService],
}) {}
