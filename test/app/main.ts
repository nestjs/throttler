import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule.forRoot({}),
    // new ExpressAdapter(),
    new FastifyAdapter(),
  );
  await app.listen(3000);
}
bootstrap();
