import { ApiException } from '../common/errors/api.exception.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('trả trạng thái thành công khi truy vấn cơ sở dữ liệu được', async () => {
    const prisma = { $queryRaw: vi.fn().mockResolvedValue([]) };
    const controller = new HealthController(prisma as never);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it('trả SERVICE_UNAVAILABLE khi truy vấn cơ sở dữ liệu lỗi', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error('lỗi kết nối nội bộ')),
    };
    const controller = new HealthController(prisma as never);

    await expect(controller.check()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    } satisfies Partial<ApiException>);
  });
});
