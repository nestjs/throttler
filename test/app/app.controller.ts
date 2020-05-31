import { All, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '../../src';

@Controller()
export class AppController {
  @Get()
  @Throttle(2, 10)
  async test() {
    return 'test';
  }

  // Route that are defined in the `excludeRoutes` property.

  // excludeRoutes: ['ignored']
  @Get('ignored')
  @Throttle(2, 10)
  async ignored() {
    return 'ignored';
  }

  // excludeRoutes: [{ path: 'ignored-2', method: RequestMethod.POST }]
  @Post('ignored-2')
  @Throttle(2, 10)
  async ignored2() {
    return 'ignored';
  }

  // excludeRoutes: [{ path: 'ignored-3', method: RequestMethod.ALL }]
  @All('ignored-3')
  @Throttle(2, 10)
  async ignored3() {
    return 'ignored';
  }

  // excludeRoutes: [{ path: 'ignored/:foo', method: RequestMethod.GET }]
  @Get('ignored/:foo')
  @Throttle(2, 10)
  async ignored4() {
    return 'ignored';
  }
}
