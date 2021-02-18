import { HttpException, HttpStatus } from '@nestjs/common';

export const throttlerMessage = 'ThrottlerException: Too Many Requests';

/**
 * Throws a HttpException with a 429 status code, indicating that too many
 * requests were being fired within a certain time window.
 * @publicApi
 */
export class ThrottlerException extends HttpException {
  constructor(message?: string) {
    super(`${message || throttlerMessage}`, HttpStatus.TOO_MANY_REQUESTS);
  }
}
