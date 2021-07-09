'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        Object.defineProperty(o, k2, {
          enumerable: true,
          get: function () {
            return m[k];
          },
        });
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.getStorageToken = exports.getOptionsToken = void 0;
__exportStar(require('./throttler-module-options.interface'), exports);
__exportStar(require('./throttler-storage.interface'), exports);
__exportStar(require('./throttler.decorator'), exports);
__exportStar(require('./throttler.exception'), exports);
__exportStar(require('./throttler.guard'), exports);
__exportStar(require('./throttler.module'), exports);
var throttler_providers_1 = require('./throttler.providers');
Object.defineProperty(exports, 'getOptionsToken', {
  enumerable: true,
  get: function () {
    return throttler_providers_1.getOptionsToken;
  },
});
Object.defineProperty(exports, 'getStorageToken', {
  enumerable: true,
  get: function () {
    return throttler_providers_1.getStorageToken;
  },
});
__exportStar(require('./throttler.service'), exports);
//# sourceMappingURL=index.js.map
