import { Module, RequestMethod } from '@nestjs/common';
import { ThrottlerModule } from '../../src';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ThrottlerModule.forRoot({
    ignoreRoutes: [
      'ignored',
      { path: 'ignored-2', method: RequestMethod.POST },
      { path: 'ignored-3', method: RequestMethod.ALL },
      { path: 'ignored/:foo', method: RequestMethod.GET },
    ],
  })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
