import { RateLimitStorage } from './rate-storage.interface';
import { Type } from './type';

export interface LimiterOptions {
  ignoreList?: string[];
  callLimit?: number;
  callWindow?: number;
  storage?: Type<RateLimitStorage>
}