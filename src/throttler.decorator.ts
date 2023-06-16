import { Inject } from '@nestjs/common';
import { THROTTLER_LIMIT, THROTTLER_SKIP } from './throttler.constants';
import { getOptionsToken, getStorageToken } from './throttler.providers';
import { ThrottlerRateLimit } from './throttler-module-options.interface';

/**
 * Adds metadata to the target which will be handled by the ThrottlerGuard to
 * handle incoming requests based on the given metadata.
 * @example @Throttle([{ timeUnit: 'minute', limit: 20 }])
 * @publicApi
 */
export const Throttle = (
  limits: ThrottlerRateLimit[] = [{ timeUnit: 'minute', limit: 20 }],
): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(THROTTLER_LIMIT, limits, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(THROTTLER_LIMIT, limits, target);
    return target;
  };
};

/**
 * Adds metadata to the target which will be handled by the ThrottlerGuard
 * whether or not to skip throttling for this context.
 * @example @SkipThrottle()
 * @example @SkipThrottle(false)
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
 * @example @InjectThrottlerOptions()
 * @publicApi
 */
export const InjectThrottlerOptions = () => Inject(getOptionsToken());

/**
 * Sets the proper injection token for the `ThrottlerStorage`
 * @example @InjectThrottlerStorage()
 * @publicApi
 */
export const InjectThrottlerStorage = () => Inject(getStorageToken());
