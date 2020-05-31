import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '../../src';

@Controller()
export class AppController {
  @Throttle(2, 10)
  @Get()
  async test() {
    return 'test';
  }
}
