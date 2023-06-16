import { Provider } from '@nestjs/common';
import { ThrottlerModuleOptions } from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_OPTIONS } from './throttler.constants';
import { ThrottlerStorageMemoryService } from './throttler.service';

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
    return options.storage ?? new ThrottlerStorageMemoryService();
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
