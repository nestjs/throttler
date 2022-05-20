import { ThrottleOptions } from './throttler-module-options.interface';
import { THROTTLER_THROTTLES_OPTIONS } from './throttler.constants';

function setThrottlersMetadata(target: any, options: ThrottleOptions[]): void {
  Reflect.defineMetadata(THROTTLER_THROTTLES_OPTIONS, options, target);
}

/**
 * Adds metadata to the target which will be handled by the ThrottlerGuard to
 * handle incoming requests based on the given metadata.
 * @usage @Throttles([{limit = 20, ttl = 60}, {limit = 1, ttl = 7}])
 * @publicApi
 */
export const Throttles = (options: ThrottleOptions[]): MethodDecorator & ClassDecorator => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    const _options = Array.isArray(options) ? options : [options];
    if (descriptor) {
      setThrottlersMetadata(descriptor.value, _options);
      return descriptor;
    }
    setThrottlersMetadata(target, _options);
    return target;
  };
};
