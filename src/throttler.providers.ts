import { Provider } from '@nestjs/common';
import { ThrottlerModuleOptions } from './throttler-module-options.interface.js';
import { ThrottlerStorage } from './throttler-storage.interface.js';
import { THROTTLER_OPTIONS } from './throttler.constants.js';
import { ThrottlerStorageService } from './throttler.service.js';

export function createThrottlerProviders(options: ThrottlerModuleOptions): Provider[] {
  return [
    {
      provide: THROTTLER_OPTIONS,
      useValue: options,
    },
  ];
}

export const ThrottlerStorageProvider = {
  provide: ThrottlerStorage,
  useFactory: (options: ThrottlerModuleOptions) => {
    return !Array.isArray(options) && options.storage
      ? options.storage
      : new ThrottlerStorageService();
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
