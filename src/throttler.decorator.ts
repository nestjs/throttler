import { THROTTLER_LIMIT, THROTTLER_TTL } from './throttler.constants';

function setThrottlerMetadata(
  target: Function,
  limit: number,
  ttl: number,
): void {
  Reflect.defineMetadata(THROTTLER_LIMIT, limit, target);
  Reflect.defineMetadata(THROTTLER_TTL, ttl, target);
}

export const Throttler = (
  limit = 20,
  ttl = 60,
): ClassDecorator | MethodDecorator => {
  return (
    target: Function | Record<string, any>,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    const metaTarget = descriptor ? descriptor.value : target;
    setThrottlerMetadata(metaTarget, limit, ttl);
    return descriptor ? descriptor.value : target;
  };
};
