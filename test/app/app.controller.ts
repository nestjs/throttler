import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '../../src';

@Controller()
export class AppController {
  @Get()
  @Throttle(2, 10)
  @UseGuards(ThrottlerGuard)
  async test() {
    return 'test';
  }
}
