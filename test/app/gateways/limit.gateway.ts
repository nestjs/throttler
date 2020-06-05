import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Throttle } from '../../../src';
import { AppService } from '../app.service';

@Throttle(2, 10)
@WebSocketGateway({ path: 'limit' })
export class LimitGateway {
  constructor(private readonly appService: AppService) {}

  @SubscribeMessage('throttle-regular')
  pass() {
    return this.appService.success();
  }

  @Throttle(5, 20)
  @SubscribeMessage('throttle-override')
  throttleOverride() {
    return this.appService.success();
  }
}
