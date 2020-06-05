import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { AppService } from '../app.service';

@WebSocketGateway({ path: 'default' })
export class DefaultGateway {
  constructor(private readonly appService: AppService) {}

  @SubscribeMessage('throttle-regular')
  pass() {
    return this.appService.success();
  }
}
