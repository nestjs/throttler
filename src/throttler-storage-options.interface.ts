export interface ThrottlerStorageOptions {
  /**
   * Amount of requests done by a specific user (partially based on IP).
   */
  totalHits: Map<string, number>;

  /**
   * Unix timestamp in milliseconds that indicates `ttl` lifetime. With several
   * throttlers on the key, the latest of their windows.
   */
  expiresAt: number;

  /**
   * Define whether the request is blocked or not. With several throttlers on
   * the key, whether any of them is blocked.
   */
  isBlocked: boolean;

  /**
   * Unix timestamp in milliseconds when the block ends. With several
   * throttlers on the key, the latest of their blocks.
   */
  blockExpiresAt: number;
}

export const ThrottlerStorageOptions = Symbol('ThrottlerStorageOptions');
