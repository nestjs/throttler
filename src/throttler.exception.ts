import { HttpException, HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

const message = 'Too Many Requests';

export class ThrottlerException extends HttpException {
  constructor() {
    super(`ThrottlerException: ${message}`, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class ThrottlerWsException extends WsException {
  constructor() {
    super(`ThrottlerWsException: ${message}`);
  }
}
