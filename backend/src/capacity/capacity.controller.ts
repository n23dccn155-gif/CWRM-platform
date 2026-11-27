import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedAccount,
} from '../auth/auth.decorators.js';
import { PageQuery } from '../common/pagination.dto.js';
import { UuidParamPipe } from '../common/uuid.pipe.js';
import {
  CurrentWorkspace,
  RequirePermission,
  type WorkspaceAccess,
} from '../workspace/workspace.decorators.js';
import {
  CapacityApprovalRequest,
  CapacityDeclarationRequest,
  MemberCapacityPageResponse,
  MemberCapacityResponse,
} from './capacity.dto.js';
import { CapacityService } from './capacity.service.js';

@ApiTags('Capacity')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
export class CapacityController {
  constructor(private readonly capacities: CapacityService) {}

  /** SELF: capacity của chính người gọi trong workspace. */
  @Get('my-capacity')
  @RequirePermission('WORKSPACE_MEMBER')
  @ApiOperation({ operationId: 'getMyCapacity' })
  @ApiResponse({ status: 200, type: MemberCapacityResponse })
  getMine(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
  ) {
    return this.capacities.getMine(access.workspaceId, account.id);
  }

  @Put('my-capacity')
  @RequirePermission('WORKSPACE_MEMBER')
  @ApiOperation({ operationId: 'declareMyCapacity' })
  @ApiResponse({ status: 200, type: MemberCapacityResponse })
  declare(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: CapacityDeclarationRequest,
  ) {
    return this.capacities.declare(
      access.workspaceId,
      account.id,
      body.declaredWeeklyHours,
      body.expectedVersion,
    );
  }

  @Get('capacities')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'listWorkspaceCapacities' })
  @ApiResponse({ status: 200, type: MemberCapacityPageResponse })
  list(@CurrentWorkspace() access: WorkspaceAccess, @Query() query: PageQuery) {
    return this.capacities.list(access.workspaceId, query);
  }

  @Post('members/:userId/capacity/approve')
  @HttpCode(200)
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'approveMemberCapacity' })
  @ApiResponse({ status: 200, type: MemberCapacityResponse })
  approve(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Param('userId', new UuidParamPipe('userId')) userId: string,
    @Body() body: CapacityApprovalRequest,
  ) {
    return this.capacities.approve(
      access.workspaceId,
      userId,
      account.id,
      body.approvedWeeklyHours,
      body.expectedVersion,
    );
  }
}
