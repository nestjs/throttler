import { Controller, Get } from '@nestjs/common';
import { AppService } from '../app.service';

@Controller('default')
export class DefaultController {
  constructor(private readonly appService: AppService) {}
  @Get()
  getDefault() {
    return this.appService.success();
  }
}
