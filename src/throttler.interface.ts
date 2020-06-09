import { ThrottlerStorage } from './throttler-storage.interface';

export interface ThrottlerOptions {
  limit: number;
  ttl: number;
  ignoreUserAgents?: RegExp[];
  storage?: ThrottlerStorage;
}
