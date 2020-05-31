import { RouteInfo } from '@nestjs/common/interfaces/middleware';
import { ThrottlerStorage } from './throttler-storage.interface';
import { Type } from './type';


export interface ThrottlerOptions {
  ignoreRoutes?: Array<string | RouteInfo>;
  limit?: number;
  ttl?: number;
  storage?: Type<ThrottlerStorage>
}
