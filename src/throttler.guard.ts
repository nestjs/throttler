import { CanActivate, ExecutionContext, Inject, Injectable, RequestMethod } from '@nestjs/common';
import { RouteInfo } from '@nestjs/common/interfaces/middleware';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import { pathToRegexp } from 'path-to-regexp';
import { THROTTLER_LIMIT, THROTTLER_OPTIONS, THROTTLER_TTL } from './throttler.constants';
import { ThrottlerException } from './throttler.exception';
import { ThrottlerOptions } from './throttler.interface';
import { ThrottlerStorageService } from './throttler.service';

type RouteInfoRegex = RouteInfo & { regex: RegExp };

@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(
    @Inject(THROTTLER_OPTIONS) private readonly options: ThrottlerOptions,
    private readonly reflector: Reflector,
    private readonly storageService: ThrottlerStorageService,
  ) {}

  // TODO: Return true if current route is in ignoreRoutes.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const headerPrefix = 'X-RateLimit';

    // Return early when we have no limit or ttl data.
    const limit = this.reflector.get<number>(THROTTLER_LIMIT, handler);
    const ttl = this.reflector.get<number>(THROTTLER_TTL, handler);
    if (typeof limit === 'undefined' || typeof ttl === 'undefined') {
      return true;
    }

    // Return early if the current route is ignored.
    const req = context.switchToHttp().getRequest();
    const routes = this.normalizeRoutes(this.options.ignoreRoutes);
    for (const route of routes) {
      const currentRoutePath = req.url.replace(/^\/+/, '');
      const currentRouteMethod = this.reflector.get<RequestMethod>('method', handler);

      const ignored = (
        route.path === currentRoutePath &&
        [RequestMethod.ALL, currentRouteMethod].indexOf(route.method) !== -1
      ) || route.regex.exec(currentRoutePath);

      if (ignored) return true;
    }

    const res = context.switchToHttp().getResponse();
    const key = md5(`${req.ip}-${context.getClass().name}-${handler.name}`)
    const record = this.storageService.getRecord(key);
    const nearestExpiryTime = record.length > 0
      ? Math.ceil((record[0].getTime() - new Date().getTime()) / 1000)
      : 0;

    // Throw an error when the user reached their limit.
    if (record.length >= limit) {
      res.header('Retry-After', nearestExpiryTime);
      throw new ThrottlerException();
    }

    res.header(`${headerPrefix}-Limit`, limit);
    res.header(`${headerPrefix}-Remaining`, Math.max(0, limit - record.length));
    res.header(`${headerPrefix}-Reset`, nearestExpiryTime);

    this.storageService.addRecord(key, ttl);
    return true;
  }

  normalizeRoutes(routes: Array<string | RouteInfo>): RouteInfoRegex[] {
    if (!Array.isArray(routes)) return [];

    return routes.map((routeObj: string | RouteInfo): RouteInfoRegex => {
      const route = typeof routeObj === 'string' ? ({
        path: routeObj,
        method: RequestMethod.ALL,
      }) : routeObj;

      return { ...route, regex: pathToRegexp(route.path)  };
    });
  }
}
