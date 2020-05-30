import { ThrottlerStorage } from './throttler-storage.interface';
import { Type } from './type';

export interface ThrottlerOptions {
  ignoreList?: string[];
  callLimit?: number;
  callWindow?: number;
  storage?: Type<ThrottlerStorage>
}
