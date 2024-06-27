import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '../../src';

@Controller()
export class CustomErrorMessageController {
  @SkipThrottle({ other: true })
  @Get('default')
  defaultRoute() {
    return { success: true };
  }

  @SkipThrottle({ default: true })
  @Get('other')
  otherRoute() {
    return { success: true };
  }
}
