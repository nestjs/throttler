import { Controller, Get } from '@nestjs/common';
import { Throttle, seconds } from '../../../src';
import { AppService } from '../app.service';

@Throttle({ default: { limit: 2, ttl: seconds(10), blockDuration: seconds(20) } })
@Controller('limit')
export class LimitController {
  constructor(private readonly appService: AppService) {}
  @Get()
  getThrottled() {
    return this.appService.success();
  }

  @Throttle({ default: { limit: 5, ttl: seconds(10), blockDuration: seconds(20) } })
  @Get('higher')
  getHigher() {
    return this.appService.success();
  }
}
