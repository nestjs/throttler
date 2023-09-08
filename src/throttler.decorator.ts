import { Inject } from '@nestjs/common';
import { THROTTLER_LIMIT, THROTTLER_SKIP, THROTTLER_TTL } from './throttler.constants';
import { getOptionsToken, getStorageToken } from './throttler.providers';
import { Resolvable } from './throttler-module-options.interface';

interface ThrottlerMethodOrControllerOptions {
  limit?: Resolvable<number>;
  ttl?: Resolvable<number>;
  blockDuration?: Resolvable<number>;
}

function setThrottlerMetadata(
  target: any,
  options: Record<string, ThrottlerMethodOrControllerOptions>,
): void {
  for (const name in options) {
    Reflect.defineMetadata(THROTTLER_TTL + name, options[name].ttl, target);
    Reflect.defineMetadata(THROTTLER_LIMIT + name, options[name].limit, target);
  }
}

/**
 * Adds metadata to the target which will be handled by the ThrottlerGuard to
 * handle incoming requests based on the given metadata.
 * @example @Throttle({ default: { limit: 2, ttl: 10 }})
 * @example @Throttle({default: { limit: () => 20, ttl: () => 60 }})
 * @publicApi
 */
export const Throttle = (
  options: Record<string, ThrottlerMethodOrControllerOptions>,
): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      setThrottlerMetadata(descriptor.value, options);
      return descriptor;
    }
    setThrottlerMetadata(target, options);
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
export const SkipThrottle = (
  skip: Record<string, boolean> = { default: true },
): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    for (const key in skip) {
      if (descriptor) {
        Reflect.defineMetadata(THROTTLER_SKIP + key, skip[key], descriptor.value);
        return descriptor;
      }
      Reflect.defineMetadata(THROTTLER_SKIP + key, skip[key], target);
      return target;
    }
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
