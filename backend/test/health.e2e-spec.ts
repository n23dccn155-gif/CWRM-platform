import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp, registerNotFoundFallback } from '../src/app.setup.js';
import { validateEnv } from '../src/config/env.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Health API (e2e)', () => {
  let app: INestApplication<App>;
  const prismaStub = { $queryRaw: vi.fn() };

  beforeEach(async () => {
    prismaStub.$queryRaw.mockReset().mockResolvedValue([]);
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(
      app,
      validateEnv({ DATABASE_URL: 'postgresql://localhost/cwrm_test' }),
    );
    await app.init();
    registerNotFoundFallback(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health trả 200 khi truy vấn được cơ sở dữ liệu', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('route không tồn tại trả 404 theo phong bì lỗi', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/not-found')
      .expect(404)
      .expect({
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy tài nguyên được yêu cầu.',
          details: {},
        },
      });
  });

  it('đường dẫn ngoài tiền tố api/v1 cũng trả 404 theo phong bì lỗi', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect(404)
      .expect('Content-Type', /json/)
      .expect({
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy tài nguyên được yêu cầu.',
          details: {},
        },
      });
  });

  it('trả 503 theo phong bì lỗi khi truy vấn cơ sở dữ liệu bị lỗi', async () => {
    prismaStub.$queryRaw.mockRejectedValueOnce(new Error('lỗi kết nối bí mật'));

    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503)
      .expect({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Dịch vụ cơ sở dữ liệu hiện không khả dụng.',
          details: {},
        },
      });
  });
});
