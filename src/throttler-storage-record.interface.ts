export interface ThrottlerStorageRecord {
  /**
   * Amount of requests done by a specific user (partially based on IP).
   */
  totalHits: number;

  /**
   * Amount of seconds when the `ttl` should expire.
   */
  timeToExpire: number;

  /**
   * Define whether the request is blocked or not.
   */
  isBlocked: boolean;

  /**
   * Amount of seconds when the `totalHits` should expire.
   */
  timeToBlockExpire: number;
}

export const ThrottlerStorageRecord = Symbol('ThrottlerStorageRecord');
