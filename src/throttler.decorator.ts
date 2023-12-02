import { ExecutionContext, Inject } from '@nestjs/common';
import { Resolvable } from './throttler-module-options.interface';
import {
  THROTTLER_KEY_GENERATOR,
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TRACKER,
  THROTTLER_TTL,
} from './throttler.constants';
import { getOptionsToken, getStorageToken } from './throttler.providers';

export type ThrottlerGetTrackerFunction = (req: Record<string, any>) => Promise<string> | string;
export type ThrottlerGenerateKeyFunction = (
  context: ExecutionContext,
  trackerString: string,
  throttlerName: string,
) => string;

interface ThrottlerMethodOrControllerOptions {
  limit?: Resolvable<number>;
  ttl?: Resolvable<number>;
  getTracker?: ThrottlerGetTrackerFunction;
  generateKey?: ThrottlerGenerateKeyFunction;
}

function setThrottlerMetadata(
  target: any,
  options: Record<string, ThrottlerMethodOrControllerOptions>,
): void {
  for (const name in options) {
    Reflect.defineMetadata(THROTTLER_TTL + name, options[name].ttl, target);
    Reflect.defineMetadata(THROTTLER_LIMIT + name, options[name].limit, target);
    Reflect.defineMetadata(THROTTLER_TRACKER + name, options[name].getTracker, target);
    Reflect.defineMetadata(THROTTLER_KEY_GENERATOR + name, options[name].generateKey, target);
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
    const reflectionTarget = descriptor?.value ?? target;
    for (const key in skip) {
      Reflect.defineMetadata(THROTTLER_SKIP + key, skip[key], reflectionTarget);
    }
    return descriptor ?? target;
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
