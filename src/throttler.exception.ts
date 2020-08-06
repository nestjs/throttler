import { HttpException, HttpStatus } from '@nestjs/common';

export const message = 'Too Many Requests';

/**
 * Throws a HttpException with a 429 status code, indicating that too many
 * requests were being fired within a certain time window.
 * @publicApi
 */
export class ThrottlerException extends HttpException {
  constructor() {
    super(`ThrottlerException: ${message}`, HttpStatus.TOO_MANY_REQUESTS);
  }
}
