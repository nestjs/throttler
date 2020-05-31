import { Controller, Get } from '@nestjs/common';
import { Throttle } from '../../src/throttle.decorator';

@Controller()
export class AppController {
  @Get('restricted')
  @Throttle(2, 60)
  async restricted() {
    return 'restricted';
  }
}
