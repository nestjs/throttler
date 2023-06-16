import { ExecutionContext, ModuleMetadata, Type } from '@nestjs/common/interfaces';
import { ThrottlerStorage } from './throttler-storage.interface';

/**
 * @publicApi
 */
export interface ThrottlerModuleOptions {
  /**
   * The rate limits and time windows for different time units.
   * Each item in the array represents a time unit (e.g., minute, second, hour, day).
   * The format is { limit: number, ttl: number }.
   */
  limits?: ThrottlerRateLimit[];

  /**
   * The user agents that should be ignored (checked against the User-Agent header).
   */
  ignoreUserAgents?: RegExp[];

  /**
   * The storage options to use for rate limiting.
   * This can be an instance of a custom storage class or
   * one of the built-in storage classes (MongoDB, Redis).
   */
  storage?: ThrottlerStorage;

  /**
   * A factory method to determine if throttling should be skipped.
   * This can be based on the incoming context or something like an env value.
   */
  skipIf?: (context: ExecutionContext) => boolean;
}

/**
 * @publicApi
 */
export interface ThrottlerOptionsFactory {
  createThrottlerOptions(): Promise<ThrottlerModuleOptions> | ThrottlerModuleOptions;
}

/**
 * @publicApi
 */
export interface ThrottlerAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * The `useExisting` syntax allows you to create aliases for existing providers.
   */
  useExisting?: Type<ThrottlerOptionsFactory>;
  /**
   * The `useClass` syntax allows you to dynamically determine a class
   * that a token should resolve to.
   */
  useClass?: Type<ThrottlerOptionsFactory>;
  /**
   * The `useFactory` syntax allows for creating providers dynamically.
   */
  useFactory?: (...args: any[]) => Promise<ThrottlerModuleOptions> | ThrottlerModuleOptions;
  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: any[];
}

/**
 * Rate limit configuration for a specific time unit.
 */
export interface ThrottlerRateLimit {
  timeUnit: TimeUnit | number;
  limit: number;
}

export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week';
