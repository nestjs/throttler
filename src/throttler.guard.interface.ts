import { ThrottlerStorageRecord } from './throttler-storage-record.interface';

/**
 * Interface describing the details of a rate limit applied by the ThrottlerGuard.
 */
export interface ThrottlerLimitDetail extends ThrottlerStorageRecord {
  /**
   * Time to live for the rate limit, in seconds. After this time has elapsed, the rate limit is removed.
   */
  ttl: number;

  /**
   * Maximum number of requests allowed within the time period defined by `ttl`.
   */
  limit: number;

  /**
   * Unique identifier for the rate limit. This field is used to group requests that share the same rate limit.
   */
  key: string;

  /**
   * A string representation of the tracker object used to keep track of the incoming requests and apply the rate limit.
   */
  tracker: string;
}
