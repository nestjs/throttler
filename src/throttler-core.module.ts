import { createConfigurableDynamicRootModule } from '@golevelup/nestjs-modules';
import { Module } from '@nestjs/common';
import { LIMIT_OPTIONS } from './throttler.constants';
import { ThrottlerOptions } from './throttler.interface';

@Module({})
export class ThrottlerCoreModule extends createConfigurableDynamicRootModule<
  ThrottlerCoreModule,
  ThrottlerOptions
>(LIMIT_OPTIONS) {}
