'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var ThrottlerModule_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.ThrottlerModule = void 0;
const common_1 = require('@nestjs/common');
const throttler_constants_1 = require('./throttler.constants');
const throttler_providers_1 = require('./throttler.providers');
let ThrottlerModule = (ThrottlerModule_1 = class ThrottlerModule {
  static forRoot(options = {}) {
    const providers = [
      ...throttler_providers_1.createThrottlerProviders(options),
      throttler_providers_1.ThrottlerStorageProvider,
    ];
    return {
      module: ThrottlerModule_1,
      providers,
      exports: providers,
    };
  }
  static forRootAsync(options) {
    const providers = [
      ...this.createAsyncProviders(options),
      throttler_providers_1.ThrottlerStorageProvider,
    ];
    return {
      module: ThrottlerModule_1,
      imports: options.imports || [],
      providers,
      exports: providers,
    };
  }
  static createAsyncProviders(options) {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }
  static createAsyncOptionsProvider(options) {
    if (options.useFactory) {
      return {
        provide: throttler_constants_1.THROTTLER_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }
    return {
      provide: throttler_constants_1.THROTTLER_OPTIONS,
      useFactory: async (optionsFactory) => await optionsFactory.createThrottlerOptions(),
      inject: [options.useExisting || options.useClass],
    };
  }
});
ThrottlerModule = ThrottlerModule_1 = __decorate(
  [common_1.Global(), common_1.Module({})],
  ThrottlerModule,
);
exports.ThrottlerModule = ThrottlerModule;
//# sourceMappingURL=throttler.module.js.map
