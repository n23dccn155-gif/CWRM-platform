import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiException } from '../errors/api.exception.js';
import type { ErrorCode } from '../errors/error-codes.js';

interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details: Record<string, unknown>;
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ApiException) {
      response.status(exception.getStatus()).json({
        error: {
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
      } satisfies ErrorEnvelope);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        this.logger.error(
          `Lỗi HTTP ${status} khi xử lý yêu cầu API.`,
          exception.stack,
        );
      }
      response.status(status).json(mapHttpException(exception, status));
      return;
    }

    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error('Lỗi không dự kiến khi xử lý yêu cầu API.', stack);
    response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
        details: {},
      },
    } satisfies ErrorEnvelope);
  }
}

function mapHttpException(
  exception: HttpException,
  status: number,
): ErrorEnvelope {
  if (status === 401) {
    return makeEnvelope('UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.');
  }
  if (status === 403) {
    return makeEnvelope(
      'FORBIDDEN',
      'Bạn không có quyền thực hiện thao tác này.',
    );
  }
  if (status === 404) {
    return makeEnvelope('NOT_FOUND', 'Không tìm thấy tài nguyên được yêu cầu.');
  }
  if (status === 400) {
    return makeEnvelope('VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.', {
      fields: collectValidationFields(exception.getResponse()),
    });
  }

  if (status >= 400 && status < 500) {
    // Lỗi nghiệp vụ 409/422 phải ném bằng ApiException; nhánh này chỉ còn lỗi của tầng HTTP (413, 415...).
    return makeEnvelope('VALIDATION_ERROR', 'Yêu cầu không hợp lệ.');
  }

  return makeEnvelope(
    'INTERNAL_ERROR',
    'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
  );
}

function makeEnvelope(
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
): ErrorEnvelope {
  return { error: { code, message, details } };
}

function collectValidationFields(value: unknown): Record<string, string[]> {
  if (!isRecord(value)) return {};

  const fields: Record<string, string[]> = {};
  if (isRecord(value.message)) {
    for (const [field, messages] of Object.entries(value.message)) {
      if (Array.isArray(messages)) {
        fields[field] = messages.filter(
          (message): message is string => typeof message === 'string',
        );
      }
    }
  }

  const errors = Array.isArray(value.validationErrors)
    ? value.validationErrors
    : Array.isArray(value.message)
      ? value.message
      : [];

  for (const item of errors) {
    if (typeof item === 'string') {
      const match = item.match(/^([\w.[\]-]+)\s+(.+)$/);
      const field = match?.[1] ?? 'request';
      const message = match?.[2] ?? item;
      (fields[field] ??= []).push(message);
    } else if (isRecord(item) && typeof item.property === 'string') {
      const messages = isRecord(item.constraints)
        ? Object.values(item.constraints).filter(
            (message): message is string => typeof message === 'string',
          )
        : [];
      if (messages.length > 0) (fields[item.property] ??= []).push(...messages);
      if (Array.isArray(item.children)) {
        Object.assign(
          fields,
          collectNestedValidationFields(item.children, item.property),
        );
      }
    }
  }

  return fields;
}

function collectNestedValidationFields(
  errors: unknown[],
  parent: string,
): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const error of errors) {
    if (!isRecord(error) || typeof error.property !== 'string') continue;
    const path = `${parent}.${error.property}`;
    const messages = isRecord(error.constraints)
      ? Object.values(error.constraints).filter(
          (message): message is string => typeof message === 'string',
        )
      : [];
    if (messages.length > 0) fields[path] = messages;
    if (Array.isArray(error.children)) {
      Object.assign(
        fields,
        collectNestedValidationFields(error.children, path),
      );
    }
  }
  return fields;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
