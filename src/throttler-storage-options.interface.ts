export interface ThrottlerStorageOptions {
  /**
   * Amount of requests done by a specific user (partially based on IP).
   */
  totalHits: Map<string, number>;

  /**
   * Unix timestamp in milliseconds that indicates `ttl` lifetime.
   */
  expiresAt: number;

  /**
   * Define whether the request is blocked or not.
   */
  isBlocked: boolean;

  /**
   * Unix timestamp in milliseconds when the `totalHits` expire.
   */
  blockExpiresAt: number;
}

export const ThrottlerStorageOptions = Symbol('ThrottlerStorageOptions');
