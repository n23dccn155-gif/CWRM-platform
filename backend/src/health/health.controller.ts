import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiException } from '../common/errors/api.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Kiểm tra tình trạng API và kết nối cơ sở dữ liệu' })
  @ApiResponse({
    status: 200,
    description: 'API và cơ sở dữ liệu đang hoạt động.',
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'] } },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Cơ sở dữ liệu hiện không khả dụng.',
  })
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (error) {
      // Ghi dòng đầu của thông báo lỗi để biết nguyên nhân; response không chứa thông tin này.
      const reason =
        error instanceof Error
          ? (error.message.split(/\r?\n/)[0] ?? '').slice(0, 200)
          : 'lỗi không xác định';
      this.logger.warn(
        `Health check không truy vấn được cơ sở dữ liệu: ${reason}`,
      );
      throw new ApiException(
        'SERVICE_UNAVAILABLE',
        503,
        'Dịch vụ cơ sở dữ liệu hiện không khả dụng.',
      );
    }
  }
}
