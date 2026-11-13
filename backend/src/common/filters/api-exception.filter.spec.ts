import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ApiException } from '../errors/api.exception.js';
import { ApiExceptionFilter } from './api-exception.filter.js';

function makeHost() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('ApiExceptionFilter', () => {
  it('đưa lỗi validation vào phong bì thống nhất kèm danh sách field', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = makeHost();

    filter.catch(
      new BadRequestException({
        message: { email: ['Phải là email hợp lệ.'] },
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu gửi lên không hợp lệ.',
        details: { fields: { email: ['Phải là email hợp lệ.'] } },
      },
    });
  });

  it('chuẩn hóa lỗi 404 thành NOT_FOUND', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = makeHost();

    filter.catch(new NotFoundException(), host);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Không tìm thấy tài nguyên được yêu cầu.',
        details: {},
      },
    });
  });

  it('giữ nguyên mã, HTTP status và chi tiết của ApiException', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = makeHost();

    filter.catch(
      new ApiException(
        'VERSION_CONFLICT',
        409,
        'Dữ liệu đã thay đổi, hãy tải lại.',
        {
          currentVersion: 4,
        },
      ),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'VERSION_CONFLICT',
        message: 'Dữ liệu đã thay đổi, hãy tải lại.',
        details: { currentVersion: 4 },
      },
    });
  });

  it('lỗi 4xx khác của tầng HTTP không mang mã INTERNAL_ERROR', () => {
    const filter = new ApiExceptionFilter();
    const { host, response } = makeHost();

    filter.catch(new PayloadTooLargeException(), host);

    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Yêu cầu không hợp lệ.',
        details: {},
      },
    });
  });

  it('không trả thông tin nội bộ khi gặp lỗi không lường trước', () => {
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const filter = new ApiExceptionFilter();
    const { host, response } = makeHost();

    filter.catch(new Error('mật khẩu hoặc stack bí mật'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
        details: {},
      },
    });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'mật khẩu hoặc stack bí mật',
    );
    expect(logError).toHaveBeenCalledOnce();
    logError.mockRestore();
  });
});
