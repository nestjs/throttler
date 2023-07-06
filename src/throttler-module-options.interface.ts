import { ExecutionContext, ModuleMetadata, Type } from '@nestjs/common/interfaces';

export type Resolvable<T extends number | string | boolean> =
  | T
  | ((context: ExecutionContext) => T | Promise<T>);

/**
 * @publicApi
 */
export interface ThrottlerModuleOptions {
  /**
   * The amount of requests that are allowed within the ttl's time window.
   */
  limit?: Resolvable<number>;

  /**
   * The amount of seconds of how many requests are allowed within this time.
   */
  ttl?: Resolvable<number>;

  /**
   * The user agents that should be ignored (checked against the User-Agent header).
   */
  ignoreUserAgents?: RegExp[];

  /**
   * The storage class to use where all the record will be stored in.
   */
  storage?: any;

  /**
   * A factory method to determine if throttling should be skipped.
   * This can be based on the incoming context, or something like an env value.
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
