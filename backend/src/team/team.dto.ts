import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CharacterLength } from '../auth/auth.dto.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class TeamNameRequest {
  @ApiProperty({ minLength: 1, maxLength: 160, example: 'Marketing' })
  @Transform(trim)
  @IsString({ message: 'Tên team phải là chuỗi.' })
  @CharacterLength(1, 160, {
    message: 'Tên team sau khi bỏ khoảng trắng phải dài từ 1 đến 160 ký tự.',
  })
  name!: string;
}

export class TeamMemberCreateRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'userId phải có định dạng UUID hợp lệ.' })
  userId!: string;
}

export class TeamMemberMainRolePatchRequest {
  @ApiProperty({ format: 'uuid', nullable: true })
  @ValidateIf((_object, value) => value !== null)
  @IsUUID('all', { message: 'mainRoleId phải là UUID hợp lệ hoặc null.' })
  mainRoleId!: string | null;

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'expectedVersion phải là số nguyên.' })
  @Min(1, { message: 'expectedVersion phải từ 1 trở lên.' })
  expectedVersion!: number;
}

export class LabelRequest {
  @ApiProperty({ minLength: 1, maxLength: 100, example: 'Content' })
  @Transform(trim)
  @IsString({ message: 'Tên phải là chuỗi.' })
  @CharacterLength(1, 100, {
    message: 'Tên sau khi bỏ khoảng trắng phải dài từ 1 đến 100 ký tự.',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Chuỗi rỗng sau khi bỏ khoảng trắng được lưu là null.',
  })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Mô tả phải là chuỗi.' })
  @CharacterLength(0, 2000, {
    message: 'Mô tả không được vượt quá 2000 ký tự.',
  })
  description?: string;
}

export class MySkillsRequest {
  @ApiProperty({ type: [String], format: 'uuid', uniqueItems: true })
  @IsArray({ message: 'skillIds phải là mảng.' })
  @ArrayUnique({ message: 'skillIds không được chứa phần tử trùng.' })
  @IsUUID('all', {
    each: true,
    message: 'Mỗi phần tử của skillIds phải là UUID hợp lệ.',
  })
  skillIds!: string[];

  @ApiProperty({ minimum: 1 })
  @IsInt({ message: 'expectedVersion phải là số nguyên.' })
  @Min(1, { message: 'expectedVersion phải từ 1 trở lên.' })
  expectedVersion!: number;
}

export class TeamResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) workspaceId!: string;
  @ApiProperty() name!: string;
}

export class TeamPageResponse {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [TeamResponse] }) items!: TeamResponse[];
}

export class TeamMembershipResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) teamId!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] }) status!: string;
  @ApiProperty({ enum: ['MANAGER', 'MEMBER'] }) workspaceRole!: string;
  @ApiProperty({ format: 'uuid', nullable: true }) mainRoleId!: string | null;
  @ApiProperty({ nullable: true }) mainRoleName!: string | null;
  @ApiProperty() displayName!: string;
  @ApiProperty({ minimum: 1 }) version!: number;
}

export class TeamMembershipPageResponse {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [TeamMembershipResponse] })
  items!: TeamMembershipResponse[];
}

export class LabelResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) workspaceId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
}

export class LabelPageResponse {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [LabelResponse] }) items!: LabelResponse[];
}

export class MySkillSetResponse {
  @ApiProperty({ type: [String], format: 'uuid' }) skillIds!: string[];
  @ApiProperty({ minimum: 1 }) version!: number;
}
