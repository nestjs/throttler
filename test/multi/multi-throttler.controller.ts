import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '../../src';

@Controller()
export class MultiThrottlerController {
  @Get()
  simpleRoute() {
    return { success: true };
  }

  @SkipThrottle({ short: true })
  @Get('skip-short')
  skipShort() {
    return { success: true };
  }

  @SkipThrottle({ default: true, long: true })
  @Get('skip-default-and-long')
  skipDefAndLong() {
    return { success: true };
  }
}
