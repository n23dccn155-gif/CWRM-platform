import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const HOURS_RULE = {
  maxDecimalPlaces: 2,
  allowNaN: false,
  allowInfinity: false,
};

/** Số giờ một tuần: 0 đến 168, tối đa 2 chữ số thập phân (cột DECIMAL(8,2)). */
export class CapacityDeclarationRequest {
  @ApiProperty({ minimum: 0, maximum: 168, example: 20 })
  @IsNumber(HOURS_RULE, {
    message: 'declaredWeeklyHours phải là số, tối đa 2 chữ số thập phân.',
  })
  @Min(0, { message: 'declaredWeeklyHours không được âm.' })
  @Max(168, {
    message: 'declaredWeeklyHours không được vượt quá 168 giờ/tuần.',
  })
  declaredWeeklyHours!: number;

  @ApiProperty({ minimum: 0, description: 'Gửi 0 khi khai báo lần đầu.' })
  @IsInt({ message: 'expectedVersion phải là số nguyên.' })
  @Min(0, { message: 'expectedVersion không được âm.' })
  expectedVersion!: number;
}

export class CapacityApprovalRequest {
  @ApiProperty({ minimum: 0, maximum: 168, example: 20 })
  @IsNumber(HOURS_RULE, {
    message: 'approvedWeeklyHours phải là số, tối đa 2 chữ số thập phân.',
  })
  @Min(0, { message: 'approvedWeeklyHours không được âm.' })
  @Max(168, {
    message: 'approvedWeeklyHours không được vượt quá 168 giờ/tuần.',
  })
  approvedWeeklyHours!: number;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'expectedVersion phải là số nguyên.' })
  @Min(1, { message: 'expectedVersion phải từ 1 trở lên.' })
  expectedVersion!: number;
}

export class MemberCapacityResponse {
  @ApiProperty({ format: 'uuid' }) workspaceId!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ nullable: true }) declaredWeeklyHours!: number | null;
  @ApiProperty({ format: 'date-time', nullable: true })
  declaredAt!: string | null;
  @ApiProperty({ nullable: true }) approvedWeeklyHours!: number | null;
  @ApiProperty({ format: 'uuid', nullable: true })
  approvedByUserId!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true })
  approvedAt!: string | null;
  @ApiProperty({ enum: ['NOT_DECLARED', 'PENDING_APPROVAL', 'APPROVED'] })
  status!: string;
  @ApiProperty({ minimum: 0 }) version!: number;
}

export class MemberCapacityPageResponse {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [MemberCapacityResponse] })
  items!: MemberCapacityResponse[];
}
