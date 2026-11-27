import { Global, Injectable, Module } from '@nestjs/common';

/**
 * Đồng hồ của ứng dụng. Mọi mốc thời gian nghiệp vụ (respondedAt, declaredAt, approvedAt, audit createdAt...)
 * lấy từ đây thay vì now() của PostgreSQL, để Risk Engine không gặp mốc lớn hơn evaluatedAt khi hai đồng hồ lệch nhau
 * (cam kết ở CWRM-37 #10209). Test thay provider này bằng đồng hồ cố định.
 */
@Injectable()
export class Clock {
  now(): Date {
    return new Date();
  }
}

@Global()
@Module({ providers: [Clock], exports: [Clock] })
export class ClockModule {}
