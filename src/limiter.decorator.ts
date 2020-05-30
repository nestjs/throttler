import { CALL_LIMIT, RATE_TTL } from './limiter.constants';

function setRateLimitMetadata(
  target: Function,
  limit: number,
  ttl: number,
): void {
  Reflect.defineMetadata(CALL_LIMIT, limit, target);
  Reflect.defineMetadata(RATE_TTL, ttl, target);
}

export const RateLimit = (
  callLimit = 20,
  ttl = 60,
): ClassDecorator | MethodDecorator => {
  return (
    target: Function | Record<string, any>,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    const metaTarget = descriptor ? descriptor.value : target;
    setRateLimitMetadata(metaTarget, callLimit, ttl);
    return descriptor ? descriptor.value : target;
  };
};
