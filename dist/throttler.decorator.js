'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.InjectThrottlerStorage =
  exports.InjectThrottlerOptions =
  exports.SkipThrottle =
  exports.Throttle =
    void 0;
const common_1 = require('@nestjs/common');
const throttler_constants_1 = require('./throttler.constants');
const throttler_providers_1 = require('./throttler.providers');
function setThrottlerMetadata(target, limit, ttl) {
  Reflect.defineMetadata(throttler_constants_1.THROTTLER_TTL, ttl, target);
  Reflect.defineMetadata(throttler_constants_1.THROTTLER_LIMIT, limit, target);
}
const Throttle = (limit = 20, ttl = 60) => {
  return (target, propertyKey, descriptor) => {
    if (descriptor) {
      setThrottlerMetadata(descriptor.value, limit, ttl);
      return descriptor;
    }
    setThrottlerMetadata(target, limit, ttl);
    return target;
  };
};
exports.Throttle = Throttle;
const SkipThrottle = (skip = true) => {
  return (target, propertyKey, descriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(throttler_constants_1.THROTTLER_SKIP, skip, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(throttler_constants_1.THROTTLER_SKIP, skip, target);
    return target;
  };
};
exports.SkipThrottle = SkipThrottle;
const InjectThrottlerOptions = () => common_1.Inject(throttler_providers_1.getOptionsToken());
exports.InjectThrottlerOptions = InjectThrottlerOptions;
const InjectThrottlerStorage = () => common_1.Inject(throttler_providers_1.getStorageToken());
exports.InjectThrottlerStorage = InjectThrottlerStorage;
//# sourceMappingURL=throttler.decorator.js.map
