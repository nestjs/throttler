import { HttpException } from '@nestjs/common';

export class ThrottlerException extends HttpException {
  constructor() {
    const statusCode = 429;
    super({
      status: statusCode,
      error: 'Too Many Requests',
    }, statusCode);
  }
}
