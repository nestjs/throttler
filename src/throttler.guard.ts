import { CanActivate, ExecutionContext, Inject, Injectable, RequestMethod } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces/middleware';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import { pathToRegexp } from 'path-to-regexp';
import { THROTTLER_LIMIT, THROTTLER_OPTIONS, THROTTLER_TTL } from './throttler.constants';
import { ThrottlerException } from './throttler.exception';
import { ThrottlerOptions } from './throttler.interface';
import { ThrottlerStorage } from './throttler-storage.interface';

type RouteInfoRegex = RouteInfo & { regex: RegExp };

@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(
    @Inject(THROTTLER_OPTIONS) private readonly options: ThrottlerOptions,
    @Inject(ThrottlerStorage) private readonly storageService: ThrottlerStorage,
    private readonly reflector: Reflector,
  ) {}

  // TODO: Return true if current route is in excludeRoutes.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const headerPrefix = 'X-RateLimit';

    // Return early when we have no limit or ttl data.
    const routeOrClassLimit = this.reflector.getAllAndOverride<number>(THROTTLER_LIMIT, [
      handler,
      context.getClass(),
    ]);
    const routeOrClassTtl = this.reflector.getAllAndOverride<number>(THROTTLER_TTL, [
      handler,
      context.getClass(),
    ]);
    // check if specific limits are set at class or route level
    // use global options if not
    const limit = routeOrClassLimit || this.options.limit;
    const ttl = routeOrClassTtl || this.options.ttl;
    if (typeof limit === 'undefined' || typeof ttl === 'undefined') {
      return true;
    }

    // Return early if the current route should be excluded.
    const req = context.switchToHttp().getRequest();
    const routes = this.normalizeRoutes(this.options.excludeRoutes);
    const originalUrl = req.originalUrl.replace(/^\/+/, '');
    const reqMethod = req.method;
    const queryParamsIndex = originalUrl && originalUrl.indexOf('?');
    const pathname = queryParamsIndex >= 0 ? originalUrl.slice(0, queryParamsIndex) : originalUrl;

    const isExcluded = routes.some(({ method, regex }) => {
      if (RequestMethod.ALL === method || RequestMethod[method] === reqMethod) {
        return regex.exec(pathname);
      }
      return false;
    });
    if (isExcluded) return true;

    // Here we start to check the amount of requests being done against the ttl.
    const res = context.switchToHttp().getResponse();
    const key = md5(`${req.ip}-${context.getClass().name}-${handler.name}`);
    const record = this.storageService.getRecord(key);
    const nearestExpiryTime =
      record.length > 0 ? Math.ceil((record[0].getTime() - new Date().getTime()) / 1000) : 0;

    // Throw an error when the user reached their limit.
    if (record.length >= limit) {
      res.header('Retry-After', nearestExpiryTime);
      throw new ThrottlerException();
    }

    res.header(`${headerPrefix}-Limit`, limit);
    // We're about to add a record so we need to take that into account here, otherwise
    // the header says we have a request left when there are none
    res.header(`${headerPrefix}-Remaining`, Math.max(0, limit - (record.length + 1)));
    res.header(`${headerPrefix}-Reset`, nearestExpiryTime);

    this.storageService.addRecord(key, ttl);
    return true;
  }

  normalizeRoutes(routes: Array<string | RouteInfo>): RouteInfoRegex[] {
    if (!Array.isArray(routes)) return [];

    return routes.map(
      (routeObj: string | RouteInfo): RouteInfoRegex => {
        const route =
          typeof routeObj === 'string'
            ? {
                path: routeObj,
                method: RequestMethod.ALL,
              }
            : routeObj;

        return { ...route, regex: pathToRegexp(route.path) };
      },
    );
  }
}
