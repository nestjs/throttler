import { ThrottlerStorageRecord } from './throttler-storage-record.interface';

export interface ThrottlerStorage {
  /**
   * Increment the amount of requests for a given record. The record will
   * automatically be removed from the storage once its TTL has been reached.
   */
  increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord>;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
