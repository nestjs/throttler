import { Module, DynamicModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerOptions } from '../../src';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerController } from './throttler.controller';

@Module({
  controllers: [AppController, ThrottlerController],
  providers: [AppService],
})
export class AppModule {
  static forRoot(options?: ThrottlerOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [ThrottlerModule.forRoot(options)],
    };
  }
}
