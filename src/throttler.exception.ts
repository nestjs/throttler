import { HttpException } from '@nestjs/common';

export class ThrottlerException extends HttpException {
  constructor() {
    super('ThrottlerException: Too Many Requests', 429);
  }
}
