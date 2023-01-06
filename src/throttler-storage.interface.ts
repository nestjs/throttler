export interface ThrottlerStorage {
  /**
   * The internal storage with all the request records.
   * The key is a hashed key based on the current context and IP.
   * The value of is an object contains the two keys:
   *   - totalHits: Amount of requests being done.
   *   - expiresAt: Epoch milliseconds when this key expires.
   */
  storage: Record<string, { totalHits: number; expiresAt: number }>;

  /**
   * Add a record to the storage. The record will automatically be removed from
   * the storage once its TTL has been reached.
   * The return object contains two keys:
   *   - totalHits: Amount of requestings being done.
   *   - timeToExpire: Amount of seconds remaining until this record expires.
   */
  addRecord(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number }>;
}

export const ThrottlerStorage = Symbol('ThrottlerStorage');
