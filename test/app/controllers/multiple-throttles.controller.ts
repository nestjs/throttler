import { Controller, Get, Post } from '@nestjs/common';
import { Throttles } from '../../../src';
import { AppService } from '../app.service';

@Controller('multiple')
@Throttles([
  {
    limit: 3,
    ttl: 2,
  },
  {
    limit: 5,
    ttl: 20,
  },
])
export class MultipleThrottlesController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async test() {
    return this.appService.success();
  }

  @Post('ignore-custom')
  async ignoreCustom() {
    return this.appService.ignored();
  }

  @Get('method-override')
  @Throttles([
    {
      limit: 1,
      ttl: 7,
    },
  ])
  async override() {
    return this.appService.success();
  }
}
