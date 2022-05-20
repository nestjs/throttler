import { Inject } from '@nestjs/common';
import { ThrottleOptions } from './throttler-module-options.interface';
import { THROTTLER_THROTTLES_OPTIONS, THROTTLER_SKIP } from './throttler.constants';
import { getOptionsToken, getStorageToken } from './throttler.providers';

function setThrottlerMetadata(target: any, limit: number, ttl: number): void {
  Reflect.defineMetadata(
    THROTTLER_THROTTLES_OPTIONS,
    [
      {
        limit,
        ttl,
      },
    ] as ThrottleOptions[],
    target,
  );
}

/**
 * Adds metadata to the target which will be handled by the ThrottlerGuard to
 * handle incoming requests based on the given metadata.
 * @usage @Throttle(2, 10)
 * @publicApi
 */
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

/**
 * Adds metadata to the target which will be handled by the ThrottlerGuard
 * whether or not to skip throttling for this context.
 * @usage @SkipThrottle()
 * @usage @SkipThrottle(false)
 * @publicApi
 */
export const SkipThrottle = (skip = true): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(THROTTLER_SKIP, skip, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(THROTTLER_SKIP, skip, target);
    return target;
  };
};

/**
 * Sets the proper injection token for the `THROTTLER_OPTIONS`
 * @usage @InjectThrottlerOptions()
 * @publicApi
 */
export const InjectThrottlerOptions = () => Inject(getOptionsToken());

/**
 * Sets the proper injection token for the `ThrottlerStorage`
 * @usage @InjectThrottlerStorage()
 * @publicApi
 */
export const InjectThrottlerStorage = () => Inject(getStorageToken());
