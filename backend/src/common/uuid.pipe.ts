import { Injectable, type PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ApiException } from './errors/api.exception.js';

/** Kiểm tham số đường dẫn dạng UUID và trả phong bì VALIDATION_ERROR có tên trường. */
@Injectable()
export class UuidParamPipe implements PipeTransform<unknown, string> {
  constructor(private readonly field: string) {}

  transform(value: unknown): string {
    if (typeof value === 'string' && isUUID(value, 'all')) return value;
    throw invalidUuid(this.field);
  }
}

export function invalidUuid(field: string): ApiException {
  const message = `${field} phải có định dạng UUID hợp lệ.`;
  return new ApiException('VALIDATION_ERROR', 400, message, {
    fields: { [field]: [message] },
  });
}
