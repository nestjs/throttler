import { Provider } from '@nestjs/common';
import {
  Throttler1ThrottleModuleOptions,
  ThrottlerModuleOptions,
  ThrottlerMultipleThrottlesModuleOptions,
} from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_OPTIONS } from './throttler.constants';
import { ThrottlerStorageService } from './throttler.service';

export function createThrottlerProviders(options: ThrottlerModuleOptions): Provider[] {
  const _options: ThrottlerMultipleThrottlesModuleOptions = Array.isArray(
    (<ThrottlerMultipleThrottlesModuleOptions>options).throttles,
  )
    ? options
    : {
        ignoreUserAgents: options.ignoreUserAgents,
        storage: options.storage,
        throttles: [
          {
            limit: (<Throttler1ThrottleModuleOptions>options).limit,
            ttl: (<Throttler1ThrottleModuleOptions>options).ttl,
          },
        ],
      };
  return [
    {
      provide: THROTTLER_OPTIONS,
      useValue: _options,
    },
  ];
}

export const ThrottlerStorageProvider = {
  provide: ThrottlerStorage,
  useFactory: (options: ThrottlerModuleOptions) => {
    return options.storage ? options.storage : new ThrottlerStorageService();
  },
  inject: [THROTTLER_OPTIONS],
};

/**
 * A utility function for getting the options injection token
 * @publicApi
 */
export const getOptionsToken = () => THROTTLER_OPTIONS;

/**
 * A utility function for getting the storage injection token
 * @publicApi
 */
export const getStorageToken = () => ThrottlerStorage;
