import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
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
} from './workspace.decorators.js';
import {
  InvitationCreateRequest,
  InvitationPageResponse,
  MembershipPageResponse,
  MembershipPatchRequest,
  WorkspaceInvitationResponse,
  WorkspaceMembershipResponse,
} from './member.dto.js';
import { InvitationService } from './invitation.service.js';
import { MemberService } from './member.service.js';

@ApiTags('Workspace')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
export class MemberController {
  constructor(
    private readonly members: MemberService,
    private readonly invitations: InvitationService,
  ) {}

  @Get('members')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'listWorkspaceMembers' })
  @ApiResponse({ status: 200, type: MembershipPageResponse })
  list(@CurrentWorkspace() access: WorkspaceAccess, @Query() query: PageQuery) {
    return this.members.list(access.workspaceId, query);
  }

  @Get('members/:userId')
  @RequirePermission('SELF_OR_MANAGER')
  @ApiOperation({ operationId: 'getWorkspaceMembership' })
  @ApiResponse({ status: 200, type: WorkspaceMembershipResponse })
  get(
    @CurrentWorkspace() access: WorkspaceAccess,
    @Param('userId', new UuidParamPipe('userId')) userId: string,
  ) {
    return this.members.get(access.workspaceId, userId);
  }

  @Patch('members/:userId')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'updateWorkspaceMembership' })
  @ApiResponse({ status: 200, type: WorkspaceMembershipResponse })
  update(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Param('userId', new UuidParamPipe('userId')) userId: string,
    @Body() body: MembershipPatchRequest,
  ) {
    return this.members.update(access.workspaceId, userId, account.id, body);
  }

  @Delete('members/:userId')
  @HttpCode(204)
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'removeWorkspaceMembership' })
  @ApiNoContentResponse()
  async remove(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Param('userId', new UuidParamPipe('userId')) userId: string,
  ): Promise<void> {
    await this.members.remove(access.workspaceId, userId, account.id);
  }

  @Get('invitations')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'listWorkspaceInvitations' })
  @ApiResponse({ status: 200, type: InvitationPageResponse })
  listInvitations(
    @CurrentWorkspace() access: WorkspaceAccess,
    @Query() query: PageQuery,
  ) {
    return this.invitations.listForWorkspace(access.workspaceId, query);
  }

  @Post('invitations')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'inviteWorkspaceMember' })
  @ApiCreatedResponse({ type: WorkspaceInvitationResponse })
  invite(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: InvitationCreateRequest,
  ) {
    return this.invitations.create(access.workspaceId, account.id, body.email);
  }
}

/** Lời mời gửi tới chính người gọi (SELF); không cần workspaceId trên URL. */
@ApiTags('Workspace')
@ApiBearerAuth()
@Controller('workspace-invitations')
export class MyInvitationController {
  constructor(private readonly invitations: InvitationService) {}

  @Get()
  @ApiOperation({ operationId: 'listMyWorkspaceInvitations' })
  @ApiResponse({ status: 200, type: InvitationPageResponse })
  listMine(
    @CurrentUser() account: AuthenticatedAccount,
    @Query() query: PageQuery,
  ) {
    return this.invitations.listMine(account.id, query);
  }

  @Post(':invitationId/accept')
  @HttpCode(200)
  @ApiOperation({ operationId: 'acceptWorkspaceInvitation' })
  @ApiResponse({ status: 200, type: WorkspaceMembershipResponse })
  accept(
    @CurrentUser() account: AuthenticatedAccount,
    @Param('invitationId', new UuidParamPipe('invitationId'))
    invitationId: string,
  ) {
    return this.invitations.accept(invitationId, account.id);
  }

  @Post(':invitationId/decline')
  @HttpCode(200)
  @ApiOperation({ operationId: 'declineWorkspaceInvitation' })
  @ApiResponse({ status: 200, type: WorkspaceInvitationResponse })
  decline(
    @CurrentUser() account: AuthenticatedAccount,
    @Param('invitationId', new UuidParamPipe('invitationId'))
    invitationId: string,
  ) {
    return this.invitations.decline(invitationId, account.id);
  }
}
