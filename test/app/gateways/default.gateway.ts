import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { AppService } from '../app.service';

@WebSocketGateway()
export class DefaultGateway {
  constructor(private readonly appService: AppService) {}

  @SubscribeMessage('default-regular')
  pass() {
    return this.appService.success();
  }
}
