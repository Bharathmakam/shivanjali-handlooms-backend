import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    cors: {
      origin: ['http://localhost:3000', 'http://192.168.0.2:3000'],
      credentials: true,
    },
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
