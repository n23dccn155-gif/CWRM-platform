import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp, registerNotFoundFallback } from './app.setup.js';
import { EnvValidationError, validateEnv } from './config/env.js';

// Nạp .env bằng API có sẵn của Node.js để khi chạy thật không phụ thuộc gói dotenv.
// Biến đã có sẵn trong môi trường được giữ nguyên, không bị file .env ghi đè.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

async function bootstrap(): Promise<void> {
  const config = validateEnv(process.env);
  const app = await NestFactory.create(AppModule);
  configureApp(app, config);
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CWRM API')
    .setVersion('0.1.0-draft')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  registerNotFoundFallback(app);
  await app.listen(config.port);
}

bootstrap().catch((error: unknown) => {
  // Lỗi cấu hình chỉ cần thông báo ngắn; lỗi khác in đầy đủ để dễ tìm nguyên nhân.
  console.error(error instanceof EnvValidationError ? error.message : error);
  process.exit(1);
});
