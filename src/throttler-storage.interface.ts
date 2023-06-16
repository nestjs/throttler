import { ThrottlerStorageRecord } from './throttler-storage-record.interface';

export interface ThrottlerStorage {
  /**
   * The internal storage with all the request records.
   * The key is a hashed key based on the current context, TimeUnit and IP.
   */
  storage: Record<string, ThrottlerStorageRecord>;

  /**
   * Increment the amount of requests for a given record. The record will
   * automatically be removed from the storage once its TTL has been reached.
   */
  increment(key: string, ttl: number): Promise<ThrottlerStorageRecord>;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
