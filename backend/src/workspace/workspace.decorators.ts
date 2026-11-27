import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';

/**
 * Quyền theo x-permission của contract. Guard tra workspace từ tài nguyên trên URL rồi kiểm membership ACTIVE.
 * - WORKSPACE_MEMBER: membership ACTIVE.
 * - WORKSPACE_MANAGER: Manager ACTIVE; Member ACTIVE nhận 403. Riêng tài nguyên của team, Member không thuộc team
 *   nhận 404 như TEAM_ACCESS không đạt (C33-02.1).
 * - TEAM_ACCESS: Manager của workspace chứa team, hoặc thành viên ACTIVE của team; không đạt thì 404 để không lộ team.
 * - SELF_OR_MANAGER: chính chủ :userId hoặc Manager; Member xem người khác nhận 403.
 */
export type WorkspacePermission =
  'WORKSPACE_MEMBER' | 'WORKSPACE_MANAGER' | 'TEAM_ACCESS' | 'SELF_OR_MANAGER';

/** Tham số đường dẫn dùng để tìm workspace: workspaceId, hoặc id của team/role/skill. */
export type WorkspaceScope = 'workspace' | 'team' | 'role' | 'skill';

export interface PermissionRequirement {
  permission: WorkspacePermission;
  scope: WorkspaceScope;
}

export const WORKSPACE_PERMISSION_KEY = 'cwrm:workspace-permission';
export const RequirePermission = (
  permission: WorkspacePermission,
  scope: WorkspaceScope = 'workspace',
) =>
  SetMetadata(WORKSPACE_PERMISSION_KEY, {
    permission,
    scope,
  } satisfies PermissionRequirement);

/** Kết quả guard gắn vào request: workspace đã xác định và quyền của người gọi trong workspace đó. */
export interface WorkspaceAccess {
  workspaceId: string;
  role: 'MANAGER' | 'MEMBER';
}

export type WorkspaceAccessRequest = { workspaceAccess?: WorkspaceAccess };

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, context: ExecutionContext): WorkspaceAccess => {
    const access = context
      .switchToHttp()
      .getRequest<WorkspaceAccessRequest>().workspaceAccess;
    if (!access) {
      throw new Error(
        'CurrentWorkspace chỉ dùng trên route có @RequirePermission.',
      );
    }
    return access;
  },
);
