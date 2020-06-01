import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ExpressAdapter } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule.forRoot({
      excludeRoutes: [
        'ignored',
        { path: 'ignored-2', method: RequestMethod.POST },
        { path: 'ignored-3', method: RequestMethod.ALL },
        { path: 'ignored/:foo', method: RequestMethod.GET },
      ],
    }),
    // new ExpressAdapter(),
    new FastifyAdapter(),
  );
  await app.listen(3000);
}
bootstrap();
