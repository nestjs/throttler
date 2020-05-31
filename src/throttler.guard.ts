import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLER_LIMIT, THROTTLER_TTL } from './throttler.constants';

@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit = this.reflector.get<number>(
      THROTTLER_LIMIT,
      context.getHandler()
    );

    const ttl = this.reflector.get<number>(
      THROTTLER_TTL,
      context.getHandler()
    );

    return true;
  }
}
