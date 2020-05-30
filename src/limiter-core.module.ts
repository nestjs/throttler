import { createConfigurableDynamicRootModule } from '@golevelup/nestjs-modules';
import { Module } from '@nestjs/common';
import { LIMIT_OPTIONS } from './limiter.constants';
import { LimiterOptions } from './limiter.interface';

@Module({})
export class LimiterCoreModule extends createConfigurableDynamicRootModule<
  LimiterCoreModule,
  LimiterOptions
>(LIMIT_OPTIONS) {}
