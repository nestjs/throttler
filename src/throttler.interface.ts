import { ThrottlerStorage } from './throttler-storage.interface';
import { Type } from './type';

export interface ThrottlerOptions {
  ignoreRoutes?: string[];
  limit?: number;
  ttl?: number;
  storage?: Type<ThrottlerStorage>
}
