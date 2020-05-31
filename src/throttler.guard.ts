import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as md5 from 'md5';
import { THROTTLER_LIMIT, THROTTLER_TTL } from './throttler.constants';
import { ThrottlerException } from './throttler.exception';
import { ThrottlerStorageService } from './throttler.service';

@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly storageService: ThrottlerStorageService,
  ) {}

  // TODO: Return true if current route is in ignoreRoutes.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();

    const limit = this.reflector.get<number>(THROTTLER_LIMIT, handler);
    const ttl = this.reflector.get<number>(THROTTLER_TTL, handler);
    if (typeof limit === 'undefined' || typeof ttl === 'undefined') {
      return true;
    }

    const req = context.switchToHttp().getRequest();
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

    res.header('RateLimit-Limit', limit);
    res.header('RateLimit-Remaining', Math.max(0, limit - record.length));
    res.header('RateLimit-Reset', nearestExpiryTime);

    this.storageService.addRecord(key, ttl);
    return true;
  }
}
