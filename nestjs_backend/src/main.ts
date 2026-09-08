import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Kích hoạt CORS (Lấy từ CORS_ALLOWED_ORIGINS trong .env)
  app.enableCors({
    origin: configService.get<string[]>('cors.allowedOrigins'),
    credentials: true,
  });

  const port = configService.get<number>('port')!;
  await app.listen(port);

  Logger.log(
    `NestJS Backend đang chạy tại: http://localhost:${port}`,
    'Bootstrap',
  );
  Logger.log(
    `Kiểm thử ApiResponse tại: http://localhost:${port}/test/response/ok-data-message`,
    'Bootstrap',
  );
}

bootstrap();
