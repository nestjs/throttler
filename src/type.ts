import { RateLimitStorage } from './rate-storage.interface';

export type Type<T extends RateLimitStorage> = { new(...args: any[]): T };