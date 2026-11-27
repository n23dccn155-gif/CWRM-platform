import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
} from '../workspace/workspace.decorators.js';
import { CatalogService } from './catalog.service.js';
import {
  LabelPageResponse,
  LabelRequest,
  LabelResponse,
  MySkillSetResponse,
  MySkillsRequest,
  TeamMemberCreateRequest,
  TeamMemberMainRolePatchRequest,
  TeamMembershipPageResponse,
  TeamMembershipResponse,
  TeamNameRequest,
  TeamPageResponse,
  TeamResponse,
} from './team.dto.js';
import { TeamService } from './team.service.js';

@ApiTags('Team')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId')
export class WorkspaceTeamController {
  constructor(
    private readonly teams: TeamService,
    private readonly catalog: CatalogService,
  ) {}

  @Get('teams')
  @RequirePermission('WORKSPACE_MEMBER')
  @ApiOperation({ operationId: 'listTeams' })
  @ApiResponse({ status: 200, type: TeamPageResponse })
  listTeams(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Query() query: PageQuery,
  ) {
    return this.teams.list(access, account.id, query);
  }

  @Post('teams')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'createTeam' })
  @ApiCreatedResponse({ type: TeamResponse })
  createTeam(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: TeamNameRequest,
  ) {
    return this.teams.create(access.workspaceId, account.id, body.name);
  }

  @Get('roles')
  @RequirePermission('WORKSPACE_MEMBER')
  @ApiOperation({ operationId: 'listRoles' })
  @ApiResponse({ status: 200, type: LabelPageResponse })
  listRoles(
    @CurrentWorkspace() access: WorkspaceAccess,
    @Query() query: PageQuery,
  ) {
    return this.catalog.list('role', access.workspaceId, query);
  }

  @Post('roles')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'createRole' })
  @ApiCreatedResponse({ type: LabelResponse })
  createRole(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: LabelRequest,
  ) {
    return this.catalog.create('role', access.workspaceId, account.id, body);
  }

  @Get('skills')
  @RequirePermission('WORKSPACE_MEMBER')
  @ApiOperation({ operationId: 'listSkills' })
  @ApiResponse({ status: 200, type: LabelPageResponse })
  listSkills(
    @CurrentWorkspace() access: WorkspaceAccess,
    @Query() query: PageQuery,
  ) {
    return this.catalog.list('skill', access.workspaceId, query);
  }

  @Post('skills')
  @RequirePermission('WORKSPACE_MANAGER')
  @ApiOperation({ operationId: 'createSkill' })
  @ApiCreatedResponse({ type: LabelResponse })
  createSkill(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: LabelRequest,
  ) {
    return this.catalog.create('skill', access.workspaceId, account.id, body);
  }

  /** SELF: chỉ sửa tập skill của chính người gọi, không nhận userId. */
  @Put('my-skills')
  @RequirePermission('WORKSPACE_MEMBER')
  @ApiOperation({ operationId: 'replaceMySkills' })
  @ApiResponse({ status: 200, type: MySkillSetResponse })
  replaceMySkills(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: MySkillsRequest,
  ) {
    return this.catalog.replaceMySkills(
      access.workspaceId,
      account.id,
      body.skillIds,
      body.expectedVersion,
    );
  }
}

@ApiTags('Team')
@ApiBearerAuth()
@Controller('teams/:teamId')
export class TeamController {
  constructor(private readonly teams: TeamService) {}

  @Get()
  @RequirePermission('TEAM_ACCESS', 'team')
  @ApiOperation({ operationId: 'getTeam' })
  @ApiResponse({ status: 200, type: TeamResponse })
  get(@Param('teamId') teamId: string) {
    return this.teams.get(teamId);
  }

  @Patch()
  @RequirePermission('WORKSPACE_MANAGER', 'team')
  @ApiOperation({ operationId: 'updateTeam' })
  @ApiResponse({ status: 200, type: TeamResponse })
  rename(
    @Param('teamId') teamId: string,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: TeamNameRequest,
  ) {
    return this.teams.rename(teamId, account.id, body.name);
  }

  @Get('members')
  @RequirePermission('TEAM_ACCESS', 'team')
  @ApiOperation({ operationId: 'listTeamMembers' })
  @ApiResponse({ status: 200, type: TeamMembershipPageResponse })
  listMembers(@Param('teamId') teamId: string, @Query() query: PageQuery) {
    return this.teams.listMembers(teamId, query);
  }

  @Post('members')
  @RequirePermission('WORKSPACE_MANAGER', 'team')
  @ApiOperation({ operationId: 'addTeamMember' })
  @ApiCreatedResponse({ type: TeamMembershipResponse })
  addMember(
    @CurrentWorkspace() access: WorkspaceAccess,
    @Param('teamId') teamId: string,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: TeamMemberCreateRequest,
  ) {
    return this.teams.addMember(access, teamId, account.id, body.userId);
  }

  @Delete('members/:userId')
  @HttpCode(204)
  @RequirePermission('WORKSPACE_MANAGER', 'team')
  @ApiOperation({ operationId: 'removeTeamMember' })
  @ApiNoContentResponse()
  async removeMember(
    @Param('teamId') teamId: string,
    @CurrentUser() account: AuthenticatedAccount,
    @Param('userId', new UuidParamPipe('userId')) userId: string,
  ): Promise<void> {
    await this.teams.removeMember(teamId, account.id, userId);
  }

  @Patch('members/:userId')
  @RequirePermission('WORKSPACE_MANAGER', 'team')
  @ApiOperation({ operationId: 'setTeamMemberMainRole' })
  @ApiResponse({ status: 200, type: TeamMembershipResponse })
  setMainRole(
    @CurrentWorkspace() access: WorkspaceAccess,
    @Param('teamId') teamId: string,
    @CurrentUser() account: AuthenticatedAccount,
    @Param('userId', new UuidParamPipe('userId')) userId: string,
    @Body() body: TeamMemberMainRolePatchRequest,
  ) {
    return this.teams.setMainRole(
      access,
      teamId,
      account.id,
      userId,
      body.mainRoleId,
      body.expectedVersion,
    );
  }
}

@ApiTags('Team')
@ApiBearerAuth()
@Controller('roles/:roleId')
export class RoleController {
  constructor(private readonly catalog: CatalogService) {}

  @Patch()
  @RequirePermission('WORKSPACE_MANAGER', 'role')
  @ApiOperation({ operationId: 'updateRole' })
  @ApiResponse({ status: 200, type: LabelResponse })
  update(
    @Param('roleId') roleId: string,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: LabelRequest,
  ) {
    return this.catalog.update('role', roleId, account.id, body);
  }

  @Delete()
  @HttpCode(204)
  @RequirePermission('WORKSPACE_MANAGER', 'role')
  @ApiOperation({ operationId: 'deleteRole' })
  @ApiNoContentResponse()
  async remove(
    @Param('roleId') roleId: string,
    @CurrentUser() account: AuthenticatedAccount,
  ): Promise<void> {
    await this.catalog.remove('role', roleId, account.id);
  }
}

@ApiTags('Team')
@ApiBearerAuth()
@Controller('skills/:skillId')
export class SkillController {
  constructor(private readonly catalog: CatalogService) {}

  @Patch()
  @RequirePermission('WORKSPACE_MANAGER', 'skill')
  @ApiOperation({ operationId: 'updateSkill' })
  @ApiResponse({ status: 200, type: LabelResponse })
  update(
    @Param('skillId') skillId: string,
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: LabelRequest,
  ) {
    return this.catalog.update('skill', skillId, account.id, body);
  }

  @Delete()
  @HttpCode(204)
  @RequirePermission('WORKSPACE_MANAGER', 'skill')
  @ApiOperation({ operationId: 'deleteSkill' })
  @ApiNoContentResponse()
  async remove(
    @Param('skillId') skillId: string,
    @CurrentUser() account: AuthenticatedAccount,
  ): Promise<void> {
    await this.catalog.remove('skill', skillId, account.id);
  }
}
