import { SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { Throttle, ThrottlerGuard } from '../../../src';
import { AppService } from '../app.service';
import { UseGuards } from '@nestjs/common';

@Throttle(2, 10)
@UseGuards(ThrottlerGuard)
@WebSocketGateway()
export class LimitGateway {
  constructor(private readonly appService: AppService) {}

  @SubscribeMessage('limit-regular')
  pass() {
    return this.appService.success();
  }

  @Throttle(5, 20)
  @SubscribeMessage('limit-override')
  throttleOverride() {
    return this.appService.success();
  }
}
