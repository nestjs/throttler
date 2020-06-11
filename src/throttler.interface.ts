export interface ThrottlerOptions {
  /**
   * The amount of requests that are allowed within the ttl's time window.
   */
  limit?: number;

  /**
   * The amount of seconds of how many requests are allowed within this time.
   */
  ttl?: number;

  /**
   * The user agents that should be ignored. Checked against the `User-Agent` header
   */
  ignoreUserAgents?: RegExp[];

  /**
   * The storage class to use where all the record will be stored in.
   */
  storage?: any;
}
