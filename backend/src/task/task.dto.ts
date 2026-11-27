import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CharacterLength } from '../auth/auth.dto.js';
import { PageQuery } from '../common/pagination.dto.js';

export const TASK_STATUSES = [
  'TO_DO',
  'IN_PROGRESS',
  'BLOCKED',
  'REVIEW',
  'DONE',
] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const ASSIGNMENT_MODES = ['DIRECT', 'OPEN_WORK'] as const;
export const DEADLINE_TYPES = ['FIXED', 'FLEXIBLE'] as const;
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
const OPEN_WORK_STATES = [
  'NOT_OPENED',
  'OPEN',
  'TEMPORARILY_FULL',
  'CLOSED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type AssignmentMode = (typeof ASSIGNMENT_MODES)[number];
export type DeadlineType = (typeof DEADLINE_TYPES)[number];

/** Giới hạn kỹ thuật của cột DECIMAL(8,2); contract chỉ ghi minimum 0. */
export const MAX_EFFORT_HOURS = 999999.99;
/** Giới hạn của cột INTEGER; contract chỉ ghi minimum 1. */
export const MAX_REQUIRED_PEOPLE = 2147483647;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** RFC 3339 date-time của contract: phải có giờ và múi giờ (Z hoặc ±hh:mm). */
const DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

function DateTimeField(field: string): PropertyDecorator {
  return (target, key) => {
    IsISO8601(
      { strict: true },
      { message: `${field} phải là thời điểm ISO-8601 hợp lệ.` },
    )(target, key);
    Matches(DATE_TIME, {
      message: `${field} phải có cả giờ và múi giờ, ví dụ 2026-12-01T10:00:00Z.`,
    })(target, key);
  };
}

/** Trường không bắt buộc nhưng không nhận null (IsOptional của class-validator bỏ qua cả null). */
const Optional = () => ValidateIf((_object, value) => value !== undefined);
/** Trường không bắt buộc và nhận null. */
const NullableOptional = () =>
  ValidateIf((_object, value) => value !== undefined && value !== null);

const EFFORT_RULE = {
  maxDecimalPlaces: 2,
  allowNaN: false,
  allowInfinity: false,
};

export class TaskListQuery extends PageQuery {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'workspaceId phải có định dạng UUID hợp lệ.' })
  workspaceId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'teamId phải có định dạng UUID hợp lệ.' })
  teamId?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES, { message: 'status không thuộc danh sách cho phép.' })
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @IsOptional()
  @IsIn(PRIORITIES, { message: 'priority không thuộc danh sách cho phép.' })
  priority?: Priority;

  @ApiPropertyOptional({ enum: RISK_LEVELS })
  @IsOptional()
  @IsIn(RISK_LEVELS, { message: 'riskLevel không thuộc danh sách cho phép.' })
  riskLevel?: string;

  @ApiPropertyOptional({ enum: ASSIGNMENT_MODES })
  @IsOptional()
  @IsIn(ASSIGNMENT_MODES, {
    message: 'assignmentMode không thuộc danh sách cho phép.',
  })
  assignmentMode?: AssignmentMode;

  @ApiPropertyOptional({ enum: OPEN_WORK_STATES })
  @IsOptional()
  @IsIn(OPEN_WORK_STATES, {
    message: 'openWorkState không thuộc danh sách cho phép.',
  })
  openWorkState?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', {
    message: 'accountableUserId phải có định dạng UUID hợp lệ.',
  })
  accountableUserId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', {
    message: 'responsibleUserId phải có định dạng UUID hợp lệ.',
  })
  responsibleUserId?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Lấy task có deadlineAt < giá trị này.',
  })
  @IsOptional()
  @DateTimeField('deadlineBefore')
  deadlineBefore?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Lấy task có deadlineAt >= giá trị này.',
  })
  @IsOptional()
  @DateTimeField('deadlineAfter')
  deadlineAfter?: string;
}

export class TaskCreateRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'teamId phải có định dạng UUID hợp lệ.' })
  teamId!: string;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  @Transform(trim)
  @IsString({ message: 'title phải là chuỗi.' })
  @CharacterLength(1, 200, {
    message: 'title sau khi bỏ khoảng trắng phải dài từ 1 đến 200 ký tự.',
  })
  title!: string;

  @ApiPropertyOptional()
  @Optional()
  @IsString({ message: 'description phải là chuỗi.' })
  @CharacterLength(0, 10000, {
    message: 'description không được vượt quá 10000 ký tự.',
  })
  description?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', {
    message: 'accountableUserId phải có định dạng UUID hợp lệ.',
  })
  accountableUserId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Optional()
  @IsUUID('all', { message: 'milestoneId phải có định dạng UUID hợp lệ.' })
  milestoneId?: string;

  @ApiProperty({ enum: PRIORITIES })
  @IsIn(PRIORITIES, { message: 'priority không thuộc danh sách cho phép.' })
  priority!: Priority;

  @ApiProperty({ format: 'date-time' })
  @DateTimeField('deadlineAt')
  deadlineAt!: string;

  @ApiProperty({ enum: DEADLINE_TYPES })
  @IsIn(DEADLINE_TYPES, {
    message: 'deadlineType không thuộc danh sách cho phép.',
  })
  deadlineType!: DeadlineType;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @NullableOptional()
  @IsNumber(EFFORT_RULE, {
    message: 'effortEstimateHours phải là số, tối đa 2 chữ số thập phân.',
  })
  @Min(0, { message: 'effortEstimateHours không được âm.' })
  @Max(MAX_EFFORT_HOURS, {
    message: `effortEstimateHours không được vượt quá ${MAX_EFFORT_HOURS}.`,
  })
  effortEstimateHours?: number | null;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'requiredPeople phải là số nguyên.' })
  @Min(1, { message: 'requiredPeople phải từ 1 trở lên.' })
  @Max(MAX_REQUIRED_PEOPLE, { message: 'requiredPeople quá lớn.' })
  requiredPeople!: number;

  @ApiProperty({ enum: ASSIGNMENT_MODES })
  @IsIn(ASSIGNMENT_MODES, {
    message: 'assignmentMode không thuộc danh sách cho phép.',
  })
  assignmentMode!: AssignmentMode;

  @ApiPropertyOptional({ type: [String], format: 'uuid', uniqueItems: true })
  @Optional()
  @IsArray({ message: 'requiredRoleIds phải là mảng.' })
  @ArrayUnique({ message: 'requiredRoleIds không được chứa phần tử trùng.' })
  @IsUUID('all', {
    each: true,
    message: 'Mỗi phần tử của requiredRoleIds phải là UUID hợp lệ.',
  })
  requiredRoleIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid', uniqueItems: true })
  @Optional()
  @IsArray({ message: 'requiredSkillIds phải là mảng.' })
  @ArrayUnique({ message: 'requiredSkillIds không được chứa phần tử trùng.' })
  @IsUUID('all', {
    each: true,
    message: 'Mỗi phần tử của requiredSkillIds phải là UUID hợp lệ.',
  })
  requiredSkillIds?: string[];
}

/** Không có status, accountableUserId hay openWork: forbidNonWhitelisted trả 400 khi client gửi các trường đó. */
export class TaskPatchRequest {
  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'expectedVersion phải là số nguyên.' })
  @Min(1, { message: 'expectedVersion phải từ 1 trở lên.' })
  expectedVersion!: number;

  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  @Optional()
  @Transform(trim)
  @IsString({ message: 'title phải là chuỗi.' })
  @CharacterLength(1, 200, {
    message: 'title sau khi bỏ khoảng trắng phải dài từ 1 đến 200 ký tự.',
  })
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @NullableOptional()
  @IsString({ message: 'description phải là chuỗi hoặc null.' })
  @CharacterLength(0, 10000, {
    message: 'description không được vượt quá 10000 ký tự.',
  })
  description?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @NullableOptional()
  @IsUUID('all', { message: 'milestoneId phải là UUID hợp lệ hoặc null.' })
  milestoneId?: string | null;

  @ApiPropertyOptional({ enum: PRIORITIES })
  @Optional()
  @IsIn(PRIORITIES, { message: 'priority không thuộc danh sách cho phép.' })
  priority?: Priority;

  @ApiPropertyOptional({ format: 'date-time' })
  @Optional()
  @DateTimeField('deadlineAt')
  deadlineAt?: string;

  @ApiPropertyOptional({ enum: DEADLINE_TYPES })
  @Optional()
  @IsIn(DEADLINE_TYPES, {
    message: 'deadlineType không thuộc danh sách cho phép.',
  })
  deadlineType?: DeadlineType;

  @ApiPropertyOptional({ minimum: 0, nullable: true })
  @NullableOptional()
  @IsNumber(EFFORT_RULE, {
    message: 'effortEstimateHours phải là số, tối đa 2 chữ số thập phân.',
  })
  @Min(0, { message: 'effortEstimateHours không được âm.' })
  @Max(MAX_EFFORT_HOURS, {
    message: `effortEstimateHours không được vượt quá ${MAX_EFFORT_HOURS}.`,
  })
  effortEstimateHours?: number | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid', uniqueItems: true })
  @Optional()
  @IsArray({ message: 'requiredRoleIds phải là mảng.' })
  @ArrayUnique({ message: 'requiredRoleIds không được chứa phần tử trùng.' })
  @IsUUID('all', {
    each: true,
    message: 'Mỗi phần tử của requiredRoleIds phải là UUID hợp lệ.',
  })
  requiredRoleIds?: string[];

  @ApiPropertyOptional({ type: [String], format: 'uuid', uniqueItems: true })
  @Optional()
  @IsArray({ message: 'requiredSkillIds phải là mảng.' })
  @ArrayUnique({ message: 'requiredSkillIds không được chứa phần tử trùng.' })
  @IsUUID('all', {
    each: true,
    message: 'Mỗi phần tử của requiredSkillIds phải là UUID hợp lệ.',
  })
  requiredSkillIds?: string[];

  @ApiPropertyOptional({ description: 'Bắt buộc khi đổi deadline FIXED.' })
  @Optional()
  @Transform(trim)
  @IsString({ message: 'reason phải là chuỗi.' })
  @CharacterLength(1, 2000, {
    message: 'reason sau khi bỏ khoảng trắng phải dài từ 1 đến 2000 ký tự.',
  })
  reason?: string;
}

export class RequiredPeoplePatchRequest {
  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'requiredPeople phải là số nguyên.' })
  @Min(1, { message: 'requiredPeople phải từ 1 trở lên.' })
  @Max(MAX_REQUIRED_PEOPLE, { message: 'requiredPeople quá lớn.' })
  requiredPeople!: number;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'expectedVersion phải là số nguyên.' })
  @Min(1, { message: 'expectedVersion phải từ 1 trở lên.' })
  expectedVersion!: number;
}
