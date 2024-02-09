import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '../../src';

@Controller()
export class FunctionOverridesThrottlerController {
  @SkipThrottle({ custom: true })
  @Get()
  simpleRoute() {
    return { success: true };
  }

  @SkipThrottle({ custom: true })
  @Get('1')
  simpleRouteOne() {
    return { success: true };
  }

  @SkipThrottle({ default: true })
  @Get('custom')
  simpleRouteTwo() {
    return { success: true };
  }

  @SkipThrottle({ default: true })
  @Get('custom/1')
  simpleRouteThrww() {
    return { success: true };
  }
}
