import { RouteInfo } from '@nestjs/common/interfaces/middleware';
import { ThrottlerStorage } from './throttler-storage.interface';

export interface ThrottlerOptions {
  excludeRoutes?: Array<string | RouteInfo>;
  limit?: number;
  ttl?: number;
  storage?: ThrottlerStorage;
}
