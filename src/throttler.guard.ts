import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import { ThrottlerModuleOptions } from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_LIMIT, THROTTLER_SKIP, THROTTLER_TTL } from './throttler.constants';
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
   * @throws ThrottlerException
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Return early if the current route should be skipped.
    if (this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP, [handler, classRef])) {
      return true;
    }

    // Return early when we have no limit or ttl data.
    const routeOrClassLimit = this.reflector.getAllAndOverride<number>(THROTTLER_LIMIT, [
      handler,
      classRef,
    ]);
    const routeOrClassTtl = this.reflector.getAllAndOverride<number>(THROTTLER_TTL, [
      handler,
      classRef,
    ]);

    // Check if specific limits are set at class or route level, otherwise use global options.
    const limit = routeOrClassLimit || this.options.limit;
    const ttl = routeOrClassTtl || this.options.ttl;
    return this.handleRequest(context, limit, ttl);
  }

  /**
   * Throttles incoming HTTP requests.
   * All the outgoing requests will contain RFC-compatible RateLimit headers.
   * @see https://tools.ietf.org/id/draft-polli-ratelimit-headers-00.html#header-specifications
   * @throws ThrottlerException
   */
  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
  ): Promise<boolean> {
    // Here we start to check the amount of requests being done against the ttl.
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
    const trackers = Array.isArray(tracker) ? tracker : [tracker];
    let maxTtlsLen = 0;
    let nearestExpiryTime = 0;
    const keys = [];
    const promises = trackers.map(
      (tracker) =>
        new Promise<void>(async (resolve) => {
          const key = this.generateKey(context, tracker);
          const ttls = await this.storageService.getRecord(key);
          if (maxTtlsLen < ttls.length) {
            maxTtlsLen = ttls.length;
            const expiryTime = ttls.length > 0 ? Math.ceil((ttls[0] - Date.now()) / 1000) : 0;
            nearestExpiryTime = Math.max(nearestExpiryTime, expiryTime);
          }
          keys.push(key);
          resolve();
        }),
    );
    await Promise.all(promises);

    // Throw an error when the user reached their limit.
    if (maxTtlsLen >= limit) {
      res.header('Retry-After', nearestExpiryTime);
      this.throwThrottlingException(context);
    }

    res.header(`${this.headerPrefix}-Limit`, limit);
    // We're about to add a record so we need to take that into account here.
    // Otherwise the header says we have a request left when there are none.
    res.header(`${this.headerPrefix}-Remaining`, Math.max(0, limit - (maxTtlsLen + 1)));
    res.header(`${this.headerPrefix}-Reset`, nearestExpiryTime);

    keys.forEach((key) => this.storageService.addRecord(key, ttl));

    return true;
  }

  protected getTracker(req: Record<string, any>): string | string[] {
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
  protected generateKey(context: ExecutionContext, suffix: string): string {
    const prefix = `${context.getClass().name}-${context.getHandler().name}`;
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
