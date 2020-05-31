import { All, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '../../src';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  @Throttle(2, 10)
  async test() {
    return this.appService.success();
  }

  // Route that are defined in the `excludeRoutes` property.

  // excludeRoutes: ['ignored']
  @Get('ignored')
  @Throttle(2, 10)
  async ignored() {
    return this.appService.ignored();
  }

  // excludeRoutes: [{ path: 'ignored-2', method: RequestMethod.POST }]
  @Post('ignored-2')
  @Throttle(2, 10)
  async ignored2() {
    return this.appService.ignored();
  }

  // excludeRoutes: [{ path: 'ignored-3', method: RequestMethod.ALL }]
  @All('ignored-3')
  @Throttle(2, 10)
  async ignored3() {
    return this.appService.ignored();
  }

  // excludeRoutes: [{ path: 'ignored/:foo', method: RequestMethod.GET }]
  @Get('ignored/:foo')
  @Throttle(2, 10)
  async ignored4() {
    return this.appService.ignored();
  }
}
