import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Tham số phân trang chung theo components.parameters Page/PageSize của contract. */
export class PageQuery {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(1, { message: 'page phải từ 1 trở lên.' })
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt({ message: 'pageSize phải là số nguyên.' })
  @Min(1, { message: 'pageSize phải từ 1 trở lên.' })
  @Max(100, { message: 'pageSize không được vượt quá 100.' })
  pageSize = 20;
}

export interface Page<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export function pageArgs(query: PageQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}
