import { Controller, Get, Post } from '@nestjs/common';
import { SkipThrottle, Throttle } from '../../../src';
import { AppService } from '../app.service';

@Controller('skip')
@Throttle(2, 10)
@SkipThrottle((context, req) => req.body && req.body.skipBy === 'class')
export class SkipController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async skipByClass() {
    return this.appService.ignored();
  }

  @Post('skip-by-root-option')
  @SkipThrottle(false)
  async skipByRootOption() {
    return this.appService.ignored();
  }

  @Post('dont-skip-at-all')
  @SkipThrottle(null)
  async dontSkip() {
    return this.appService.ignored();
  }

  @Post('skip-method')
  @SkipThrottle((context, req) => req.body && req.body.skipBy === 'method')
  async skipByMethod() {
    return this.appService.ignored();
  }
}
