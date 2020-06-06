import { HttpException, HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

const message = 'Too Many Requests';

/**
 * Throws a HttpException with a 429 status code, indicating that too many
 * requests were being fired within a certain time window.
 */
export class ThrottlerException extends HttpException {
  constructor() {
    super(`ThrottlerException: ${message}`, HttpStatus.TOO_MANY_REQUESTS);
  }
}

/**
 * Throws a WsException indicating that too many requests were being fired
 * within a certain time window.
 */
export class ThrottlerWsException extends WsException {
  constructor() {
    super(`ThrottlerWsException: ${message}`);
  }
}
