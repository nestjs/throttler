export interface ThrottlerStorageOptions {
  /**
   * Amount of requests done by a specific user (partially based on IP).
   */
  totalHits: number;

  /**
   * Unix timestamp in milliseconds when the `totalHits` expire.
   */
  expiresAt: number;
}

export const ThrottlerStorageOptions = Symbol('ThrottlerStorageOptions');
