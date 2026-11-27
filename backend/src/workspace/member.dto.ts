import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CharacterLength } from '../auth/auth.dto.js';

export class MembershipPatchRequest {
  @ApiPropertyOptional({ enum: ['MANAGER', 'MEMBER'] })
  @IsOptional()
  @IsIn(['MANAGER', 'MEMBER'], { message: 'role phải là MANAGER hoặc MEMBER.' })
  role?: 'MANAGER' | 'MEMBER';

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'], {
    message: 'status phải là ACTIVE hoặc INACTIVE.',
  })
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({ minLength: 1 })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'reason phải là chuỗi.' })
  @CharacterLength(1, 2000, { message: 'reason phải dài từ 1 đến 2000 ký tự.' })
  reason?: string;
}

export class InvitationCreateRequest {
  @ApiProperty({ format: 'email', example: 'content@example.com' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Email phải là chuỗi.' })
  @CharacterLength(1, 320, { message: 'Email phải dài từ 1 đến 320 ký tự.' })
  @IsEmail({}, { message: 'Email không hợp lệ.' })
  email!: string;
}

export class WorkspaceMembershipResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) workspaceId!: string;
  @ApiProperty({ format: 'uuid' }) userId!: string;
  @ApiProperty({ enum: ['MANAGER', 'MEMBER'] }) role!: string;
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'] }) status!: string;
  @ApiProperty() displayName!: string;
  @ApiProperty({ type: [String], format: 'uuid' }) skillIds!: string[];
  @ApiProperty({ minimum: 1 }) skillsVersion!: number;
}

export class MembershipPageResponse {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [WorkspaceMembershipResponse] })
  items!: WorkspaceMembershipResponse[];
}

export class WorkspaceInvitationResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) workspaceId!: string;
  @ApiProperty() workspaceName!: string;
  @ApiProperty({ format: 'uuid' }) invitedUserId!: string;
  @ApiProperty({ format: 'uuid' }) invitedByUserId!: string;
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'DECLINED'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class InvitationPageResponse {
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [WorkspaceInvitationResponse] })
  items!: WorkspaceInvitationResponse[];
}
