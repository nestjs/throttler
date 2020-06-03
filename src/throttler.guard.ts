import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import { ThrottlerStorage } from './throttler-storage.interface';
import {
  THROTTLER_LIMIT,
  THROTTLER_OPTIONS,
  THROTTLER_SKIP,
  THROTTLER_TTL
} from './throttler.constants';
import { ThrottlerException, ThrottlerWsException } from './throttler.exception';
import { ThrottlerOptions } from './throttler.interface';

@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(
    @Inject(THROTTLER_OPTIONS) private readonly options: ThrottlerOptions,
    @Inject(ThrottlerStorage) private readonly storageService: ThrottlerStorage,
    private readonly reflector: Reflector,
  ) {}

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

    switch (context.getType()) {
      case 'http': return this.httpHandler(context, limit, ttl);
      case 'ws': return this.websocketHandler(context, limit, ttl);
    }
  }

  private httpHandler(context: ExecutionContext, limit: number, ttl: number): boolean {
    const headerPrefix = 'X-RateLimit';

    // Here we start to check the amount of requests being done against the ttl.
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const key = this.generateKey(context, req.ip);
    const ttls = this.storageService.getRecord(key);
    const nearestExpiryTime =
      ttls.length > 0 ? Math.ceil((ttls[0].getTime() - new Date().getTime()) / 1000) : 0;

    // Throw an error when the user reached their limit.
    if (ttls.length >= limit) {
      res.header('Retry-After', nearestExpiryTime);
      throw new ThrottlerException();
    }

    res.header(`${headerPrefix}-Limit`, limit);
    // We're about to add a record so we need to take that into account here, otherwise
    // the header says we have a request left when there are none
    res.header(`${headerPrefix}-Remaining`, Math.max(0, limit - (ttls.length + 1)));
    res.header(`${headerPrefix}-Reset`, nearestExpiryTime);

    this.storageService.addRecord(key, ttl);
    return true;
  }

  private websocketHandler(context: ExecutionContext, limit: number, ttl: number): boolean {
    const client = context.switchToWs().getClient();
    const key = this.generateKey(context, client.conn.remoteAddress);
    const ttls = this.storageService.getRecord(key);

    if (ttls.length >= limit) {
      throw new ThrottlerWsException();
    }

    this.storageService.addRecord(key, ttl);
    return true;
  }

  private generateKey(context: ExecutionContext, prefix: string): string {
    const suffix = `${context.getClass().name}-${context.getHandler().name}`;
    return md5(`${prefix}-${suffix}`)
  }
}
