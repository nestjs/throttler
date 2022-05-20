import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import {
  ThrottleOptions,
  ThrottlerMultipleThrottlesModuleOptions,
} from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_THROTTLES_OPTIONS, THROTTLER_SKIP } from './throttler.constants';
import { InjectThrottlerOptions, InjectThrottlerStorage } from './throttler.decorator';
import { ThrottlerException, throttlerMessage } from './throttler.exception';

type RateLimit = {
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  protected headerPrefix = 'X-RateLimit';
  protected errorMessage = throttlerMessage;
  constructor(
    @InjectThrottlerOptions() protected readonly options: ThrottlerMultipleThrottlesModuleOptions,
    @InjectThrottlerStorage() protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {}

  /**
   * Throttle requests against their TTL limit and whether to allow or deny it.
   * Based on the context type different handlers will be called.
   * @throws ThrottlerException
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Return early if the current route should be skipped.
    if (this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP, [handler, classRef])) {
      return true;
    }

    const routeThrotlesOptions =
      this.reflector.getAllAndOverride<ThrottleOptions[]>(THROTTLER_THROTTLES_OPTIONS, [
        handler,
        classRef,
      ]) || this.options.throttles;

    let minRateLimit: RateLimit = null;
    for (let i = 0; i < routeThrotlesOptions.length; i++) {
      const rateLimit = await this.handleRequest(context, routeThrotlesOptions[i], i);
      if (rateLimit) {
        // use RateLimit which is most likely to be blocked
        if (!minRateLimit) {
          minRateLimit = rateLimit;
        } else if (
          minRateLimit.remaining > rateLimit.remaining ||
          (minRateLimit.remaining === rateLimit.remaining && minRateLimit.reset < rateLimit.reset)
        ) {
          minRateLimit = rateLimit;
        }
      }
    }
    if (minRateLimit) {
      const { res } = this.getRequestResponse(context);
      res.header(`${this.headerPrefix}-Limit`, minRateLimit.limit);
      // We're about to add a record so we need to take that into account here.
      // Otherwise the header says we have a request left when there are none.
      res.header(`${this.headerPrefix}-Remaining`, minRateLimit.remaining);
      res.header(`${this.headerPrefix}-Reset`, minRateLimit.reset);
    }
    return true;
  }

  /**
   * Throttles incoming HTTP requests.
   * All the outgoing requests will contain RFC-compatible RateLimit headers.
   * @see https://tools.ietf.org/id/draft-polli-ratelimit-headers-00.html#header-specifications
   * @throws ThrottlerException
   */
  protected async handleRequest(
    context: ExecutionContext,
    routeThrotleOptions: ThrottleOptions,
    throtleIndex: number,
  ): Promise<RateLimit> {
    // Here we start to check the amount of requests being done against the ttl.
    const { req, res } = this.getRequestResponse(context);
    const { limit, ttl, ignore, ignoreUserAgents } = routeThrotleOptions;

    const _ignore = ignore || this.options.ignore;
    const _ignoreUserAgents = ignoreUserAgents || this.options.ignoreUserAgents;

    if (_ignore) {
      if (_ignore(context, req, res)) {
        return;
      }
    }
    if (Array.isArray(_ignoreUserAgents)) {
      // Return early if the current user agent should be ignored.
      for (const pattern of _ignoreUserAgents) {
        if (pattern.test(req.headers['user-agent'])) {
          return;
        }
      }
    }

    const tracker = this.getTracker(req);
    const key = this.generateKey(context, throtleIndex, tracker);
    const ttls = await this.storageService.getRecord(key);
    const nearestExpiryTime = ttls.length > 0 ? Math.ceil((ttls[0] - Date.now()) / 1000) : 0;

    // Throw an error when the user reached their limit.
    if (ttls.length >= limit) {
      res.header('Retry-After', nearestExpiryTime);
      this.throwThrottlingException(context);
    }

    const rateLimit = {
      limit,
      remaining: Math.max(0, limit - (ttls.length + 1)),
      reset: nearestExpiryTime,
    };

    await this.storageService.addRecord(key, ttl);
    return rateLimit;
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
   * The key will always be a combination of the current context and IP.
   */
  protected generateKey(context: ExecutionContext, throttleIndex: number, suffix: string): string {
    const prefix = `${context.getClass().name}-${throttleIndex}-${context.getHandler().name}`;
    return md5(`${prefix}-${suffix}`);
  }

  /**
   * Throws an exception for the event that the rate limit has been exceeded.
   *
   * The context parameter allows to access the context when overwriting
   * the method.
   * @throws ThrottlerException
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected throwThrottlingException(context: ExecutionContext): void {
    throw new ThrottlerException(this.errorMessage);
  }
}
