import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { ApiException } from '../common/errors/api.exception.js';
import { invalidUuid } from '../common/uuid.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedRequest } from '../auth/auth.decorators.js';
import {
  WORKSPACE_PERMISSION_KEY,
  type PermissionRequirement,
  type WorkspaceAccessRequest,
  type WorkspaceScope,
} from './workspace.decorators.js';

const SCOPE_PARAM: Record<WorkspaceScope, string> = {
  workspace: 'workspaceId',
  team: 'teamId',
  role: 'roleId',
  skill: 'skillId',
};

const NOT_FOUND_MESSAGE: Record<WorkspaceScope, string> = {
  workspace: 'Không tìm thấy workspace được yêu cầu.',
  team: 'Không tìm thấy team được yêu cầu.',
  role: 'Không tìm thấy role được yêu cầu.',
  skill: 'Không tìm thấy skill được yêu cầu.',
};

@Injectable()
export class WorkspacePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<
      PermissionRequirement | PermissionRequirement['permission']
    >(WORKSPACE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!requirement) return true;
    const { permission, scope } =
      typeof requirement === 'string'
        ? { permission: requirement, scope: 'workspace' as const }
        : requirement;

    const request = context
      .switchToHttp()
      .getRequest<Request & AuthenticatedRequest & WorkspaceAccessRequest>();
    const paramName = SCOPE_PARAM[scope];
    const resourceId = request.params[paramName];
    if (typeof resourceId !== 'string' || !isUUID(resourceId, 'all')) {
      throw invalidUuid(paramName);
    }
    if (permission === 'SELF_OR_MANAGER') {
      const userId = request.params.userId;
      if (typeof userId !== 'string' || !isUUID(userId, 'all')) {
        throw invalidUuid('userId');
      }
    }

    const notFound = new ApiException(
      'NOT_FOUND',
      404,
      NOT_FOUND_MESSAGE[scope],
    );
    const workspaceId = await this.resolveWorkspaceId(scope, resourceId);
    if (!workspaceId) throw notFound;

    const membership = await this.prisma.workspaceMembership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: request.user.id } },
      select: { role: true, status: true },
    });
    // Không có membership ACTIVE thì trả cùng 404 như tài nguyên không tồn tại, để không lộ ID.
    if (!membership || membership.status !== 'ACTIVE') throw notFound;

    const isManager = membership.role === 'MANAGER';
    // C33-02.1: Member chỉ "nhìn thấy" team mình đang là thành viên ACTIVE. Ngoài phạm vi đó trả 404 như
    // team không tồn tại, kể cả với thao tác cần Manager; thấy team mà thiếu quyền thao tác mới là 403.
    if (
      scope === 'team' &&
      !isManager &&
      (permission === 'TEAM_ACCESS' || permission === 'WORKSPACE_MANAGER')
    ) {
      const teamMembership = await this.prisma.teamMembership.findUnique({
        where: {
          teamId_userId: { teamId: resourceId, userId: request.user.id },
        },
        select: { status: true },
      });
      if (teamMembership?.status !== 'ACTIVE') throw notFound;
    }
    if (permission === 'WORKSPACE_MANAGER' && !isManager) {
      throw forbidden();
    }
    if (permission === 'SELF_OR_MANAGER' && !isManager) {
      if (request.params.userId !== request.user.id) throw forbidden();
    }

    request.workspaceAccess = { workspaceId, role: membership.role };
    return true;
  }

  private async resolveWorkspaceId(
    scope: WorkspaceScope,
    id: string,
  ): Promise<string | undefined> {
    const select = { workspaceId: true } as const;
    switch (scope) {
      case 'workspace':
        return id;
      case 'team':
        return (await this.prisma.team.findUnique({ where: { id }, select }))
          ?.workspaceId;
      case 'role':
        return (await this.prisma.role.findUnique({ where: { id }, select }))
          ?.workspaceId;
      case 'skill':
        return (await this.prisma.skill.findUnique({ where: { id }, select }))
          ?.workspaceId;
    }
  }
}

function forbidden(): ApiException {
  return new ApiException(
    'FORBIDDEN',
    403,
    'Bạn không có quyền thực hiện thao tác này.',
  );
}
