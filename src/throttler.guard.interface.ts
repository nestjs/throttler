import { ExecutionContext } from '@nestjs/common';
import { ThrottlerStorageRecord } from './throttler-storage-record.interface';
import {
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerOptions,
} from './throttler-module-options.interface';

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

export interface ThrottlerRequest {
  /**
   * Interface describing details about the current request pipeline.
   */
  context: ExecutionContext;

  /**
   * The amount of requests that are allowed within the ttl's time window.
   */
  limit: number;

  /**
   * The number of milliseconds the limit of requests are allowed
   */
  ttl: number;

  /**
   * Incoming options of the throttler
   */
  throttler: ThrottlerOptions;

  /**
   * The number of millisecond the request will be blocked
   */
  blockDuration: number;

  /**
   * A method to override the default tracker string.
   */
  getTracker: ThrottlerGetTrackerFunction;

  /**
   * A method to override the default key generator.
   */
  generateKey: ThrottlerGenerateKeyFunction;
}
