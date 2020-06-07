export interface ThrottlerStorage {
  /**
   * Get a record via its key and return all its request ttls.
   */
  getRecord(key: string): Promise<number[]>;

  /**
   * Add a record to the storage. The record should automatically be removed
   * from the storage once its TTL has been reached.
   */
  addRecord(key: string, ttl: number): Promise<void>;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
