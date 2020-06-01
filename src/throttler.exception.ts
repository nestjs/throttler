import { HttpException, HttpStatus } from '@nestjs/common';

export class ThrottlerException extends HttpException {
  constructor() {
    super('ThrottlerException: Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
  }
}
