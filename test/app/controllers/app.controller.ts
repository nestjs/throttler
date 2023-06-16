import { Controller, Get } from '@nestjs/common';
import { SkipThrottle, Throttle } from '../../../src';
import { AppService } from '../app.service';

@Controller()
@Throttle([{ timeUnit: 'minute', limit: 6 }])
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async test() {
    return this.appService.success();
  }

  @Get('ignored')
  @SkipThrottle()
  async ignored() {
    return this.appService.ignored();
  }

  @Get('ignore-user-agents')
  async ignoreUserAgents() {
    return this.appService.ignored();
  }

  @Throttle([{ timeUnit: 20, limit: 3 }]) // 20 seconds
  @Get('custom')
  getCustom() {
    return this.appService.success();
  }
}
