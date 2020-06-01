import { THROTTLER_LIMIT, THROTTLER_TTL } from './throttler.constants';

function setThrottlerMetadata(target: Function, limit: number, ttl: number): void {
  Reflect.defineMetadata(THROTTLER_LIMIT, limit, target);
  Reflect.defineMetadata(THROTTLER_TTL, ttl, target);
}

export const Throttle = (limit = 20, ttl = 60): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      setThrottlerMetadata(descriptor.value, limit, ttl);
      return descriptor;
    }
    setThrottlerMetadata(target, limit, ttl);
    return target;
  };
};
