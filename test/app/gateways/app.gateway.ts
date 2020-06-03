import { UseGuards } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { SkipThrottle, Throttle, ThrottlerGuard } from '../../../src';
import { AppService } from '../app.service';

@Throttle(2, 10)
@WebSocketGateway({ path: '/' })
export class AppGateway {
  constructor(private readonly appService: AppService) {}

  @UseGuards(ThrottlerGuard)
  @SubscribeMessage('throttle-regular')
  pass() {
    return this.appService.success();
  }

  @SkipThrottle()
  @UseGuards(ThrottlerGuard)
  @SubscribeMessage('ignore')
  ignore() {
    return this.appService.ignored();
  }

  @Throttle(5, 20)
  @UseGuards(ThrottlerGuard)
  @SubscribeMessage('throttle-override')
  throttleOverride() {
    return this.appService.success();
  }
}
