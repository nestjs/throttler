import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import {
  Resolvable,
  ThrottlerModuleOptions,
  ThrottlerOptions,
} from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_LIMIT, THROTTLER_SKIP, THROTTLER_TTL } from './throttler.constants';
import { InjectThrottlerOptions, InjectThrottlerStorage } from './throttler.decorator';
import { ThrottlerException, throttlerMessage } from './throttler.exception';
import { ThrottlerLimitDetail } from './throttler.guard.interface';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  protected headerPrefix = 'X-RateLimit';
  protected errorMessage = throttlerMessage;
  protected throttlers: Array<ThrottlerOptions>;
  protected commonOptions: Pick<ThrottlerOptions, 'skipIf' | 'ignoreUserAgents'>;
  constructor(
    @InjectThrottlerOptions() protected readonly options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {}

  async onModuleInit() {
    this.throttlers = (Array.isArray(this.options) ? this.options : this.options.throttlers)
      .sort((first, second) => {
        if (typeof first.ttl === 'function') {
          return 1;
        }
        if (typeof second.ttl === 'function') {
          return 0;
        }
        return first.ttl - second.ttl;
      })
      .map((opt) => ({ ...opt, name: opt.name ?? 'default' }));
    if (Array.isArray(this.options)) {
      this.commonOptions = {};
    } else {
      this.commonOptions = {
        skipIf: this.options.skipIf,
        ignoreUserAgents: this.options.ignoreUserAgents,
      };
    }
  }

  /**
   * Throttle requests against their TTL limit and whether to allow or deny it.
   * Based on the context type different handlers will be called.
   * @throws {ThrottlerException}
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    const continues: boolean[] = [];
    for (const namedThrottler of this.throttlers) {
      // Return early if the current route should be skipped.
      const skip = this.reflector.getAllAndOverride<boolean>(THROTTLER_SKIP + namedThrottler.name, [
        handler,
        classRef,
      ]);
      const skipIf = namedThrottler.skipIf || this.commonOptions.skipIf;
      if (skip || skipIf?.(context)) {
        continues.push(true);
        continue;
      }

      // Return early when we have no limit or ttl data.
      const routeOrClassLimit = this.reflector.getAllAndOverride<Resolvable<number>>(
        THROTTLER_LIMIT + namedThrottler.name,
        [handler, classRef],
      );
      const routeOrClassTtl = this.reflector.getAllAndOverride<Resolvable<number>>(
        THROTTLER_TTL + namedThrottler.name,
        [handler, classRef],
      );

      // Check if specific limits are set at class or route level, otherwise use global options.
      let limit = routeOrClassLimit || namedThrottler.limit;
      let ttl = routeOrClassTtl || namedThrottler.ttl;
      if (typeof limit === 'function') {
        limit = await limit(context);
      }
      if (typeof ttl === 'function') {
        ttl = await ttl(context);
      }
      continues.push(await this.handleRequest(context, limit, ttl, namedThrottler));
    }
    return continues.every((cont) => cont);
  }

  /**
   * Throttles incoming HTTP requests.
   * All the outgoing requests will contain RFC-compatible RateLimit headers.
   * @see https://tools.ietf.org/id/draft-polli-ratelimit-headers-00.html#header-specifications
   * @throws {ThrottlerException}
   */
  protected async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
  ): Promise<boolean> {
    // Here we start to check the amount of requests being done against the ttl.
    const { req, res } = this.getRequestResponse(context);
    const ignoreUserAgents = throttler.ignoreUserAgents ?? this.commonOptions.ignoreUserAgents;
    // Return early if the current user agent should be ignored.
    if (Array.isArray(ignoreUserAgents)) {
      for (const pattern of ignoreUserAgents) {
        if (pattern.test(req.headers['user-agent'])) {
          return true;
        }
      }
    }
    const tracker = this.getTracker(req);
    const key = this.generateKey(context, tracker, throttler.name);
    const { totalHits, timeToExpire } = await this.storageService.increment(key, ttl);

    const getThrottlerSuffix = (name: string) => (name === 'default' ? '' : `-${name}`);

    // Throw an error when the user reached their limit.
    if (totalHits > limit) {
      res.header(`Retry-After${getThrottlerSuffix(throttler.name)}`, timeToExpire);
      this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
      });
    }

    res.header(`${this.headerPrefix}-Limit${getThrottlerSuffix(throttler.name)}`, limit);
    // We're about to add a record so we need to take that into account here.
    // Otherwise the header says we have a request left when there are none.
    res.header(
      `${this.headerPrefix}-Remaining${getThrottlerSuffix(throttler.name)}`,
      Math.max(0, limit - totalHits),
    );
    res.header(`${this.headerPrefix}-Reset${getThrottlerSuffix(throttler.name)}`, timeToExpire);

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
   * The key will always be a combination of the current context and IP.
   */
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const prefix = `${context.getClass().name}-${context.getHandler().name}-${name}`;
    return md5(`${prefix}-${suffix}`);
  }

  /**
   * Throws an exception for the event that the rate limit has been exceeded.
   *
   * The context parameter allows to access the context when overwriting
   * the method.
   * @throws {ThrottlerException}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): void {
    throw new ThrottlerException(this.errorMessage);
  }
}
