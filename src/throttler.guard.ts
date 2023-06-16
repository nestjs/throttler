import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import {
  ThrottlerModuleOptions,
  ThrottlerRateLimit,
  TimeUnit,
} from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_LIMIT, THROTTLER_SKIP } from './throttler.constants';
import { InjectThrottlerOptions, InjectThrottlerStorage } from './throttler.decorator';
import { ThrottlerException, throttlerMessage } from './throttler.exception';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  protected headerPrefix = 'X-RateLimit';
  protected errorMessage = throttlerMessage;

  constructor(
    @InjectThrottlerOptions() protected readonly options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {}

  /**
   * Throttle requests against their TTL limit and whether to allow or deny it.
   * Based on the context type different handlers will be called.
   * @throws {ThrottlerException}
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Return early if the current route should be skipped.
    if (
      this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP, [handler, classRef]) ||
      this.options.skipIf?.(context)
    ) {
      return true;
    }

    // Return early when we have no limit.
    const routeOrClassLimit = this.reflector.getAllAndOverride<ThrottlerRateLimit[]>(
      THROTTLER_LIMIT,
      [handler, classRef],
    );

    // Check if specific limits are set at class or route level, otherwise use global options.
    const limits = routeOrClassLimit || this.options.limits;

    return this.handleRequest(context, limits);
  }

  private getTTL(timeUnit: TimeUnit | number): number {
    if (typeof timeUnit === 'number') {
      // Custom time unit specified
      return timeUnit;
    }

    // Use predefined time units
    switch (timeUnit) {
      case 'second':
        return 1;
      case 'minute':
        return 60;
      case 'hour':
        return 60 * 60;
      case 'day':
        return 24 * 60 * 60;
      case 'week':
        return 24 * 60 * 60 * 7;

      default:
        throw new Error(`Invalid time unit: ${timeUnit}`);
    }
  }
  /**
   * Throttles incoming HTTP requests.
   * All the outgoing requests will contain RFC-compatible RateLimit headers.
   * @see https://tools.ietf.org/id/draft-polli-ratelimit-headers-00.html#header-specifications
   * @throws {ThrottlerException}
   */
  protected async handleRequest(
    context: ExecutionContext,
    limits: ThrottlerRateLimit[],
  ): Promise<boolean> {
    const { req, res } = this.getRequestResponse(context);

    // Return early if the current user agent should be ignored.
    if (Array.isArray(this.options.ignoreUserAgents)) {
      for (const pattern of this.options.ignoreUserAgents) {
        if (pattern.test(req.headers['user-agent'])) {
          return true;
        }
      }
    }

    const tracker = this.getTracker(req);

    // Iterate through the rate limits and check against each one
    for (const limit of limits) {
      const key = this.generateKey(context, tracker, limit.timeUnit);
      const { totalHits, timeToExpire } = await this.storageService.increment(
        key,
        this.getTTL(limit.timeUnit) * 1000,
      );

      // Throw an error when the user has reached their limit for the current rate limit
      if (totalHits > limit.limit) {
        res.header('Retry-After', timeToExpire);
        this.throwThrottlingException(context);
      }

      // Set the appropriate headers for the rate limit
      res.header(`${this.headerPrefix}-Limit-${limit.timeUnit}`, limit.limit);
      res.header(
        `${this.headerPrefix}-Remaining-${limit.timeUnit}`,
        Math.max(0, limit.limit - totalHits),
      );
      res.header(`${this.headerPrefix}-Reset-${limit.timeUnit}`, timeToExpire);
    }

    return true;
  }

  protected getTracker(req: Record<string, any>): string {
    return req.ip;
  }

  protected getRequestResponse(context: ExecutionContext): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }

  /**
   * Generate a hashed key that will be used as a storage key.
   * The key will always be a combination of the current context, TimeUnit and IP.
   */
  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    timeUnit: TimeUnit | number,
  ): string {
    const prefix = `${context.getClass().name}-${context.getHandler().name}`;
    return md5(`${prefix}-${timeUnit}-${suffix}`);
  }

  /**
   * Throws an exception for the event that the rate limit has been exceeded.
   *
   * The context parameter allows to access the context when overwriting
   * the method.
   * @throws {ThrottlerException}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected throwThrottlingException(context: ExecutionContext): void {
    throw new ThrottlerException(this.errorMessage);
  }
}
