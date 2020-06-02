import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { AppService } from '../app.service';
import { SkipThrottle, Throttle } from '../../../src';

@Throttle(2, 10)
@WebSocketGateway({ path: '/' })
export class AppGateway {
  constructor(private readonly appService: AppService) {}
  @SubscribeMessage('throttle-regular')
  pass() {
    return this.appService.success();
  }

  @SkipThrottle()
  @SubscribeMessage('ignore')
  ignore() {
    return this.appService.ignored();
  }

  @Throttle(5, 20)
  @SubscribeMessage('throttle-override')
  throttleOverride() {
    return this.appService.success();
  }
}
