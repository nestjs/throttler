import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle, seconds, ThrottlerGuard } from '../../../src';
import { AppService } from '../app.service';

@Controller()
@Throttle({ default: { limit: 2, ttl: seconds(10) } })
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @UseGuards(ThrottlerGuard)
  // @Throttle({ low: { limit: 3, ttl: seconds(60) } })
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
