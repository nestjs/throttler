import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerStorageService } from '../../src';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ThrottlerModule.forRoot()],
  controllers: [AppController],
  providers: [AppService, ThrottlerStorageService],
})
export class AppModule {}
