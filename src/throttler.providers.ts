import { Provider } from '@nestjs/common';
import { ThrottlerModuleOptions } from './throttler-module-options.interface';
import { ThrottlerStorage } from './throttler-storage.interface';
import { THROTTLER_OPTIONS } from './throttler.constants';
import { ThrottlerStorageService } from './throttler.service';

export function createThrottlerProviders(options: ThrottlerModuleOptions): Provider[] {
  return [
    {
      provide: THROTTLER_OPTIONS,
      useValue: options,
    },
  ];
}

// Custom storage may already be registered as a provider. Keep its lifecycle
// hooks owned by that provider and expose only the storage contract here.
class DelegatingThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly storage: ThrottlerStorage) {}

  increment(...args: Parameters<ThrottlerStorage['increment']>) {
    return this.storage.increment(...args);
  }
}

export const ThrottlerStorageProvider = {
  provide: ThrottlerStorage,
  useFactory: (options: ThrottlerModuleOptions) => {
    return !Array.isArray(options) && options.storage
      ? new DelegatingThrottlerStorage(options.storage)
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
