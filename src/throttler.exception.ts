import { HttpException, HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

export class ThrottlerException extends HttpException {
  constructor() {
    super('ThrottlerException: Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class ThrottlerWsException extends WsException {
  constructor() {
    super('ThrottlerWsException: Too Many Requests');
  }
}
