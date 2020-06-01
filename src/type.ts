import { ThrottlerStorage } from './throttler-storage.interface';

export type Type<T extends ThrottlerStorage> = { new (...args: any[]): T };
