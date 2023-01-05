export interface ThrottlerStorage {
  /**
   * The internal storage with all the request records.
   * The key is a hashed key based on the current context and IP.
   * The value of is an object contains the two keys:
   *   - totalHits    (number): Amount of requests being done.
   *   - timeToExpire (number): Amount of seconds until this expiration.
   */
  storage: Record<string, { totalHits: number; timeToExpire: number }>;

  /**
   * Add a record to the storage. The record will automatically be removed from
   * the storage once its TTL has been reached.
   */
  addRecord(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }>;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
