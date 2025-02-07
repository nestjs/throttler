import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sha256 } from './hash';
import {
  Resolvable,
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions,
  ThrottlerOptions,
} from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import {
  THROTTLER_BLOCK_DURATION,
  THROTTLER_KEY_GENERATOR,
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TRACKER,
  THROTTLER_TTL,
} from './throttler.constants';
import { InjectThrottlerOptions, InjectThrottlerStorage } from './throttler.decorator';
import { ThrottlerException, throttlerMessage } from './throttler.exception';
import { ThrottlerLimitDetail, ThrottlerRequest } from './throttler.guard.interface';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  protected headerPrefix = 'X-RateLimit';
  protected errorMessage = throttlerMessage;
  protected throttlers: Array<ThrottlerOptions>;
  protected commonOptions: Pick<
    ThrottlerOptions,
    'skipIf' | 'ignoreUserAgents' | 'getTracker' | 'generateKey'
  >;

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
        getTracker: this.options.getTracker,
        generateKey: this.options.generateKey,
      };
    }
    this.commonOptions.getTracker ??= this.getTracker.bind(this);
    this.commonOptions.generateKey ??= this.generateKey.bind(this);
  }

  /**
   * Throttle requests against their TTL limit and whether to allow or deny it.
   * Based on the context type different handlers will be called.
   * @throws {ThrottlerException}
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    if (await this.shouldSkip(context)) {
      return true;
    }
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
      const routeOrClassBlockDuration = this.reflector.getAllAndOverride<Resolvable<number>>(
        THROTTLER_BLOCK_DURATION + namedThrottler.name,
        [handler, classRef],
      );
      const routeOrClassGetTracker = this.reflector.getAllAndOverride<ThrottlerGetTrackerFunction>(
        THROTTLER_TRACKER + namedThrottler.name,
        [handler, classRef],
      );
      const routeOrClassGetKeyGenerator =
        this.reflector.getAllAndOverride<ThrottlerGenerateKeyFunction>(
          THROTTLER_KEY_GENERATOR + namedThrottler.name,
          [handler, classRef],
        );

      // Check if specific limits are set at class or route level, otherwise use global options.
      const limit = await this.resolveValue(context, routeOrClassLimit || namedThrottler.limit);
      const ttl = await this.resolveValue(context, routeOrClassTtl || namedThrottler.ttl);
      const blockDuration = await this.resolveValue(
        context,
        routeOrClassBlockDuration || namedThrottler.blockDuration || ttl,
      );
      const getTracker =
        routeOrClassGetTracker || namedThrottler.getTracker || this.commonOptions.getTracker;
      const generateKey =
        routeOrClassGetKeyGenerator || namedThrottler.generateKey || this.commonOptions.generateKey;
      continues.push(
        await this.handleRequest({
          context,
          limit,
          ttl,
          throttler: namedThrottler,
          blockDuration,
          getTracker,
          generateKey,
        }),
      );
    }
    return continues.every((cont) => cont);
  }

  protected async shouldSkip(_context: ExecutionContext): Promise<boolean> {
    return false;
  }

  /**
   * Throttles incoming HTTP requests.
   * All the outgoing requests will contain RFC-compatible RateLimit headers.
   * @see https://tools.ietf.org/id/draft-polli-ratelimit-headers-00.html#header-specifications
   * @throws {ThrottlerException}
   */
  protected async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context, limit, ttl, throttler, blockDuration, getTracker, generateKey } = requestProps;

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
    const tracker = await getTracker(req, context);
    const key = generateKey(context, tracker, throttler.name);
    const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } =
      await this.storageService.increment(key, ttl, limit, blockDuration, throttler.name);

    const getThrottlerSuffix = (name: string) => (name === 'default' ? '' : `-${name}`);

    // Throw an error when the user reached their limit.
    if (isBlocked) {
      res.header(`Retry-After${getThrottlerSuffix(throttler.name)}`, timeToBlockExpire);
      await this.throwThrottlingException(context, {
        limit,
        ttl,
        key,
        tracker,
        totalHits,
        timeToExpire,
        isBlocked,
        timeToBlockExpire,
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

  protected async getTracker(req: Record<string, any>): Promise<string> {
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
    return sha256(`${prefix}-${suffix}`);
  }

  /**
   * Throws an exception for the event that the rate limit has been exceeded.
   *
   * The context parameter allows to access the context when overwriting
   * the method.
   * @throws {ThrottlerException}
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new ThrottlerException(await this.getErrorMessage(context, throttlerLimitDetail));
  }

  protected async getErrorMessage(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<string> {
    if (!Array.isArray(this.options)) {
      if (!this.options.errorMessage) return this.errorMessage;

      return typeof this.options.errorMessage === 'function'
        ? this.options.errorMessage(context, throttlerLimitDetail)
        : this.options.errorMessage;
    }
    return this.errorMessage;
  }

  protected async resolveValue<T extends number | string | boolean>(
    context: ExecutionContext,
    resolvableValue: Resolvable<T>,
  ): Promise<T> {
    return typeof resolvableValue === 'function' ? resolvableValue(context) : resolvableValue;
  }
}
