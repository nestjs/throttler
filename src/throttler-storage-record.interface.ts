export interface ThrottlerStorageRecord {
  /**
   * Amount of requests done by a specific user (partially based on IP).
   */
  totalHits: number;

  /**
   * Amount of seconds when the `totalHits` should expire.
   */
  timeToExpire: number;
}

export const ThrottlerStorageRecordOptions = Symbol('ThrottlerStorageRecordOptions');
