import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { sha256 } from './hash.js';
import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from './ip.js';
import {
  Resolvable,
  ThrottlerGenerateKeyFunction,
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions,
  ThrottlerOptions,
} from './throttler-module-options.interface.js';
import { ThrottlerStorage } from './throttler-storage.interface.js';
import {
  THROTTLER_BLOCK_DURATION,
  THROTTLER_KEY_GENERATOR,
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TRACKER,
  THROTTLER_TTL,
} from './throttler.constants.js';
import { InjectThrottlerOptions, InjectThrottlerStorage } from './throttler.decorator.js';
import { ThrottlerException, throttlerMessage } from './throttler.exception.js';
import { ThrottlerLimitDetail, ThrottlerRequest } from './throttler.guard.interface.js';

/**
 * @publicApi
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  protected headerPrefix = 'X-RateLimit';
  protected logger = new Logger(ThrottlerGuard.name);
  protected errorMessage = throttlerMessage;
  protected throttlers: Array<ThrottlerOptions>;
  protected commonOptions: Pick<
    ThrottlerOptions,
    'skipIf' | 'ignoreUserAgents' | 'getTracker' | 'generateKey' | 'setHeaders'
  >;
  protected ipv6SubnetPrefix: number = DEFAULT_IPV6_SUBNET_PREFIX;

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
    if (!this.throttlers.length) {
      this.logger.warn(
        'No throttlers are configured, so no request is limited. Provide at least one entry to ThrottlerModule.forRoot() or return one from ThrottlerModule.forRootAsync().',
      );
    }
    if (Array.isArray(this.options)) {
      this.commonOptions = {};
    } else {
      this.commonOptions = {
        skipIf: this.options.skipIf,
        ignoreUserAgents: this.options.ignoreUserAgents,
        getTracker: this.options.getTracker,
        generateKey: this.options.generateKey,
        setHeaders: this.options.setHeaders,
      };
      this.ipv6SubnetPrefix = this.options.ipv6SubnetPrefix ?? DEFAULT_IPV6_SUBNET_PREFIX;
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
      // Use `??` (not `||`) so an explicit `0` (e.g. to fully block a route) is not
      // silently overridden by the throttler-level default.
      const limit = await this.resolveValue(context, routeOrClassLimit ?? namedThrottler.limit);
      const ttl = await this.resolveValue(context, routeOrClassTtl ?? namedThrottler.ttl);
      const blockDuration = await this.resolveValue(
        context,
        routeOrClassBlockDuration ?? namedThrottler.blockDuration ?? ttl,
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
    const setHeaders = throttler.setHeaders ?? this.commonOptions.setHeaders ?? true;

    // Throw an error when the user reached their limit.
    if (isBlocked) {
      if (setHeaders) {
        this.setResponseHeader(
          res,
          `Retry-After${getThrottlerSuffix(throttler.name)}`,
          timeToBlockExpire,
        );
      }

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

    if (setHeaders) {
      this.setResponseHeader(
        res,
        `${this.headerPrefix}-Limit${getThrottlerSuffix(throttler.name)}`,
        limit,
      );
      // We're about to add a record so we need to take that into account here.
      // Otherwise the header says we have a request left when there are none.
      this.setResponseHeader(
        res,
        `${this.headerPrefix}-Remaining${getThrottlerSuffix(throttler.name)}`,
        Math.max(0, limit - totalHits),
      );
      this.setResponseHeader(
        res,
        `${this.headerPrefix}-Reset${getThrottlerSuffix(throttler.name)}`,
        timeToExpire,
      );
    }

    return true;
  }

  /**
   * Resolve the tracker string for a request.
   *
   * The raw source address is normalized first: a client holding an IPv6
   * allocation can otherwise send every request from a different address
   * within its own subnet and never share a counter, which defeats the limit
   * entirely. See {@link normalizeIp}.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return normalizeIp(req.ip, this.ipv6SubnetPrefix);
  }

  /**
   * Set a header on the response object of any HTTP adapter.
   *
   * Express and Fastify expose `res.header()`, while a plain Node.js
   * `ServerResponse`, which custom adapters often hand through, only has
   * `res.setHeader()`. A response offering neither is left untouched rather
   * than failing the request.
   */
  protected setResponseHeader(res: Record<string, any>, name: string, value: string | number) {
    if (typeof res.header === 'function') {
      res.header(name, value);
    } else if (typeof res.setHeader === 'function') {
      res.setHeader(name, value);
    }
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

  private async resolveValue<T extends number | string | boolean>(
    context: ExecutionContext,
    resolvableValue: Resolvable<T>,
  ): Promise<T> {
    return typeof resolvableValue === 'function' ? resolvableValue(context) : resolvableValue;
  }
}
