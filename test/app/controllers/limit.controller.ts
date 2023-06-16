import { Controller, Get } from '@nestjs/common';
import { Throttle } from '../../../src';
import { AppService } from '../app.service';

@Throttle([{ timeUnit: 'minute', limit: 2 }])
@Controller('limit')
export class LimitController {
  constructor(private readonly appService: AppService) {}
  @Get()
  getThrottled() {
    return this.appService.success();
  }

  @Throttle([{ timeUnit: 'minute', limit: 10 }])
  @Get('higher')
  getHigher() {
    return this.appService.success();
  }
}
