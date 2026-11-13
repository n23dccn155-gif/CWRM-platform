import { HttpException } from '@nestjs/common';
import type { ErrorCode } from './error-codes.js';

export class ApiException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    status: number,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message, status);
  }
}
