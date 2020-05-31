import { Module } from '@nestjs/common';
import { ThrottlerModule } from '../../src';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ThrottlerModule.forRoot()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
