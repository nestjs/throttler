import { ThrottlerStorage } from './throttler-storage.interface';

export interface ThrottlerOptions {
  /**
   * The amount of requests that are allowed within the ttl's time window.
   */
  limit?: number;

  /**
   * The amount of seconds of how many requests are allowed within this time.
   */
  ttl?: number;

  /**
   * The storage class to use where all the record will be stored in.
   */
  storage?: ThrottlerStorage;
}
