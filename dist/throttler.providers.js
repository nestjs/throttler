'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getStorageToken =
  exports.getOptionsToken =
  exports.ThrottlerStorageProvider =
  exports.createThrottlerProviders =
    void 0;
const throttler_storage_interface_1 = require('./throttler-storage.interface');
const throttler_constants_1 = require('./throttler.constants');
const throttler_service_1 = require('./throttler.service');
function createThrottlerProviders(options) {
  return [
    {
      provide: throttler_constants_1.THROTTLER_OPTIONS,
      useValue: options,
    },
  ];
}
exports.createThrottlerProviders = createThrottlerProviders;
exports.ThrottlerStorageProvider = {
  provide: throttler_storage_interface_1.ThrottlerStorage,
  useFactory: (options) => {
    return options.storage ? options.storage : new throttler_service_1.ThrottlerStorageService();
  },
  inject: [throttler_constants_1.THROTTLER_OPTIONS],
};
const getOptionsToken = () => throttler_constants_1.THROTTLER_OPTIONS;
exports.getOptionsToken = getOptionsToken;
const getStorageToken = () => throttler_storage_interface_1.ThrottlerStorage;
exports.getStorageToken = getStorageToken;
//# sourceMappingURL=throttler.providers.js.map
