import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedAccount,
} from '../auth/auth.decorators.js';
import {
  CurrentWorkspace,
  RequirePermission,
  type WorkspaceAccess,
} from '../workspace/workspace.decorators.js';
import {
  RequiredPeoplePatchRequest,
  TaskCreateRequest,
  TaskListQuery,
  TaskPatchRequest,
} from './task.dto.js';
import { TaskService } from './task.service.js';

@ApiTags('Task')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly tasks: TaskService) {}

  @Get()
  @RequirePermission('WORKSPACE_MEMBER', 'workspaceQuery')
  @ApiOperation({
    operationId: 'listTasks',
    summary:
      'riskLevel, responsibleUserId, openWorkState chưa hỗ trợ: trả 422 FILTER_NOT_AVAILABLE (P-02).',
  })
  @ApiOkResponse({ description: 'TaskPage theo contract' })
  list(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Query() query: TaskListQuery,
  ) {
    return this.tasks.list(access, account.id, query);
  }

  /** Không có workspaceId trên URL; service tìm workspace từ teamId trong body và tự kiểm quyền Manager. */
  @Post()
  @ApiOperation({ operationId: 'createTask' })
  @ApiCreatedResponse({ description: 'Task theo contract' })
  create(
    @CurrentUser() account: AuthenticatedAccount,
    @Body() body: TaskCreateRequest,
  ) {
    return this.tasks.create(account.id, body);
  }

  @Get(':taskId')
  @RequirePermission('TASK_ACCESS', 'task')
  @ApiOperation({ operationId: 'getTask' })
  @ApiOkResponse({ description: 'Task theo contract' })
  get(
    @CurrentWorkspace() access: WorkspaceAccess,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.get(taskId, access);
  }

  @Patch(':taskId')
  @RequirePermission('WORKSPACE_MANAGER', 'task')
  @ApiOperation({ operationId: 'updateTask' })
  @ApiOkResponse({ description: 'Task và version mới' })
  update(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Param('taskId') taskId: string,
    @Body() body: TaskPatchRequest,
  ) {
    return this.tasks.update(taskId, access, account.id, body);
  }

  @Patch(':taskId/required-people')
  @RequirePermission('WORKSPACE_MANAGER', 'task')
  @ApiOperation({ operationId: 'updateTaskRequiredPeople' })
  @ApiOkResponse({ description: 'Task đã cập nhật' })
  updateRequiredPeople(
    @CurrentWorkspace() access: WorkspaceAccess,
    @CurrentUser() account: AuthenticatedAccount,
    @Param('taskId') taskId: string,
    @Body() body: RequiredPeoplePatchRequest,
  ) {
    return this.tasks.updateRequiredPeople(taskId, access, account.id, body);
  }
}
