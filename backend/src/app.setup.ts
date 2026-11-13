import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { Express, Request, Response } from 'express';
import type { AppEnv } from './config/env.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';

export function configureApp(app: INestApplication, config: AppEnv): void {
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.corsOrigins });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorFormat: 'grouped',
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}

/**
 * Đường dẫn nằm ngoài tiền tố api/v1 không đi qua router của Nest nên Express trả trang HTML mặc định.
 * Hàm này gắn bộ xử lý cuối cùng để các đường dẫn đó cũng nhận phong bì lỗi JSON. Gọi sau app.init().
 */
export function registerNotFoundFallback(app: INestApplication): void {
  const http = app.getHttpAdapter().getInstance() as Express;
  http.use((_request: Request, response: Response) => {
    response.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Không tìm thấy tài nguyên được yêu cầu.',
        details: {},
      },
    });
  });
}
