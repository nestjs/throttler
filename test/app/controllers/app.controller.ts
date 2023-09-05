import { Controller, Get } from '@nestjs/common';
import { SkipThrottle, Throttle, seconds } from '../../../src';
import { AppService } from '../app.service';

@Controller()
@Throttle({ default: { limit: 2, ttl: seconds(10) } })
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
}
