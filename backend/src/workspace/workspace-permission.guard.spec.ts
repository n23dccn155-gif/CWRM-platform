import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../prisma/prisma.service.js';
import { WorkspacePermissionGuard } from './workspace-permission.guard.js';

const workspaceId = '22222222-2222-4222-8222-222222222222';
const userId = '11111111-1111-4111-8111-111111111111';

function makeContext(
  permission: 'WORKSPACE_MEMBER' | 'WORKSPACE_MANAGER',
  id = workspaceId,
) {
  const request = {
    params: { workspaceId: id },
    user: { id: userId },
  };
  const handler = () => undefined;
  return {
    context: {
      getHandler: () => handler,
      getClass: () => class WorkspaceController {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as never,
    reflector: { getAllAndOverride: vi.fn().mockReturnValue(permission) },
  };
}

describe('Bộ bảo vệ quyền workspace', () => {
  it('che giấu workspace thiếu membership hoặc membership INACTIVE bằng cùng 404', async () => {
    const prisma = {
      workspaceMembership: {
        findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({
          role: 'MANAGER',
          status: 'INACTIVE',
        }),
      },
    };
    const reflector = new Reflector();
    const guard = new WorkspacePermissionGuard(
      reflector,
      prisma as unknown as PrismaService,
    );
    const outsider = makeContext('WORKSPACE_MEMBER');
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(
      'WORKSPACE_MEMBER',
    );
    await expect(guard.canActivate(outsider.context)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Không tìm thấy workspace được yêu cầu.',
    });
    await expect(guard.canActivate(outsider.context)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Không tìm thấy workspace được yêu cầu.',
    });
  });

  it('trả 403 cho MEMBER ACTIVE khi cần MANAGER', async () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(
      'WORKSPACE_MANAGER',
    );
    const prisma = {
      workspaceMembership: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ role: 'MEMBER', status: 'ACTIVE' }),
      },
    };
    const guard = new WorkspacePermissionGuard(
      reflector,
      prisma as unknown as PrismaService,
    );
    const { context } = makeContext('WORKSPACE_MANAGER');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Bạn không có quyền thực hiện thao tác này.',
    });
  });

  it('trả 400 khi workspaceId không phải UUID', async () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(
      'WORKSPACE_MEMBER',
    );
    const prisma = { workspaceMembership: { findUnique: vi.fn() } };
    const guard = new WorkspacePermissionGuard(
      reflector,
      prisma as unknown as PrismaService,
    );
    const { context } = makeContext('WORKSPACE_MEMBER', 'sai-dinh-dang');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    expect(prisma.workspaceMembership.findUnique).not.toHaveBeenCalled();
  });
});

describe('Bộ bảo vệ quyền theo tài nguyên (WP-014B)', () => {
  const teamId = '33333333-3333-4333-8333-333333333333';

  function contextFor(
    requirement: { permission: string; scope: string },
    params: Record<string, string>,
  ) {
    const request: Record<string, unknown> = { params, user: { id: userId } };
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requirement);
    const context = {
      getHandler: () => () => undefined,
      getClass: () => class TeamController {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;
    return { request, reflector, context };
  }

  function prismaWith(options: {
    team?: { workspaceId: string } | null;
    membership?: { role: string; status: string } | null;
    teamMembership?: { status: string } | null;
  }) {
    return {
      team: { findUnique: vi.fn().mockResolvedValue(options.team ?? null) },
      role: { findUnique: vi.fn().mockResolvedValue(null) },
      skill: { findUnique: vi.fn().mockResolvedValue(null) },
      workspaceMembership: {
        findUnique: vi.fn().mockResolvedValue(options.membership ?? null),
      },
      teamMembership: {
        findUnique: vi.fn().mockResolvedValue(options.teamMembership ?? null),
      },
    };
  }

  it('tra workspace từ teamId và gắn workspaceAccess cho Manager', async () => {
    const prisma = prismaWith({
      team: { workspaceId },
      membership: { role: 'MANAGER', status: 'ACTIVE' },
    });
    const { request, reflector, context } = contextFor(
      { permission: 'TEAM_ACCESS', scope: 'team' },
      { teamId },
    );
    const guard = new WorkspacePermissionGuard(
      reflector,
      prisma as unknown as PrismaService,
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.workspaceAccess).toEqual({ workspaceId, role: 'MANAGER' });
    expect(prisma.teamMembership.findUnique).not.toHaveBeenCalled();
  });

  it('TEAM_ACCESS: Member ngoài team nhận 404 giống team không tồn tại', async () => {
    const outside = prismaWith({
      team: { workspaceId },
      membership: { role: 'MEMBER', status: 'ACTIVE' },
      teamMembership: { status: 'INACTIVE' },
    });
    const missing = prismaWith({ team: null });
    for (const prisma of [outside, missing]) {
      const { reflector, context } = contextFor(
        { permission: 'TEAM_ACCESS', scope: 'team' },
        { teamId },
      );
      const guard = new WorkspacePermissionGuard(
        reflector,
        prisma as unknown as PrismaService,
      );
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'Không tìm thấy team được yêu cầu.',
      });
    }
  });

  it('TEAM_ACCESS: Member ACTIVE của team được vào', async () => {
    const prisma = prismaWith({
      team: { workspaceId },
      membership: { role: 'MEMBER', status: 'ACTIVE' },
      teamMembership: { status: 'ACTIVE' },
    });
    const { reflector, context } = contextFor(
      { permission: 'TEAM_ACCESS', scope: 'team' },
      { teamId },
    );
    const guard = new WorkspacePermissionGuard(
      reflector,
      prisma as unknown as PrismaService,
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('C33-02.1: thao tác Manager trên team — Member ngoài team nhận 404, Member trong team nhận 403', async () => {
    for (const [teamMembership, code] of [
      [null, 'NOT_FOUND'],
      [{ status: 'INACTIVE' }, 'NOT_FOUND'],
      [{ status: 'ACTIVE' }, 'FORBIDDEN'],
    ] as const) {
      const prisma = prismaWith({
        team: { workspaceId },
        membership: { role: 'MEMBER', status: 'ACTIVE' },
        teamMembership,
      });
      const { reflector, context } = contextFor(
        { permission: 'WORKSPACE_MANAGER', scope: 'team' },
        { teamId },
      );
      const guard = new WorkspacePermissionGuard(
        reflector,
        prisma as unknown as PrismaService,
      );
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        code,
      });
    }
  });

  it('SELF_OR_MANAGER: Member xem chính mình được, xem người khác nhận 403', async () => {
    const otherId = '44444444-4444-4444-8444-444444444444';
    for (const [target, expected] of [
      [userId, true],
      [otherId, 'FORBIDDEN'],
    ] as const) {
      const prisma = prismaWith({
        membership: { role: 'MEMBER', status: 'ACTIVE' },
      });
      const { reflector, context } = contextFor(
        { permission: 'SELF_OR_MANAGER', scope: 'workspace' },
        { workspaceId, userId: target },
      );
      const guard = new WorkspacePermissionGuard(
        reflector,
        prisma as unknown as PrismaService,
      );
      if (expected === true) {
        await expect(guard.canActivate(context)).resolves.toBe(true);
      } else {
        await expect(guard.canActivate(context)).rejects.toMatchObject({
          code: expected,
        });
      }
    }
  });

  it('trả 400 có tên trường khi teamId hoặc userId sai định dạng', async () => {
    const prisma = prismaWith({});
    for (const [requirement, params, field] of [
      [{ permission: 'TEAM_ACCESS', scope: 'team' }, { teamId: 'x' }, 'teamId'],
      [
        { permission: 'SELF_OR_MANAGER', scope: 'workspace' },
        { workspaceId, userId: 'x' },
        'userId',
      ],
    ] as const) {
      const { reflector, context } = contextFor(requirement, params);
      const guard = new WorkspacePermissionGuard(
        reflector,
        prisma as unknown as PrismaService,
      );
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        details: { fields: { [field]: expect.any(Array) } },
      });
    }
    expect(prisma.workspaceMembership.findUnique).not.toHaveBeenCalled();
  });
});
