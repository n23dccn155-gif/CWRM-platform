import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { Clock } from '../common/clock.js';
import { ApiException } from '../common/errors/api.exception.js';
import { isUniqueViolation } from '../common/errors/prisma-errors.js';
import { versionConflict } from '../common/errors/version-conflict.js';
import { pageArgs, type PageQuery } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { WorkspaceAccess } from '../workspace/workspace.decorators.js';

type Db = Prisma.TransactionClient;

const TEAM_SELECT = { id: true, workspaceId: true, name: true } as const;

const TEAM_MEMBERSHIP_SELECT = {
  id: true,
  teamId: true,
  userId: true,
  status: true,
  mainRoleId: true,
  version: true,
  mainRole: { select: { name: true } },
  user: { select: { displayName: true } },
  team: { select: { workspaceId: true } },
} as const;

type TeamMembershipRow = Prisma.TeamMembershipGetPayload<{
  select: typeof TEAM_MEMBERSHIP_SELECT;
}>;

interface LockedTeamMembership {
  id: string;
  status: 'ACTIVE' | 'INACTIVE';
  main_role_id: string | null;
  version: number;
}

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  /** Manager xem mọi team của workspace; Member chỉ xem team mình đang là thành viên ACTIVE. */
  async list(access: WorkspaceAccess, userId: string, query: PageQuery) {
    const where: Prisma.TeamWhereInput = {
      workspaceId: access.workspaceId,
      ...(access.role === 'MANAGER'
        ? {}
        : { memberships: { some: { userId, status: 'ACTIVE' } } }),
    };
    const [total, items] = await Promise.all([
      this.prisma.team.count({ where }),
      this.prisma.team.findMany({
        where,
        select: TEAM_SELECT,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
    ]);
    return { page: query.page, pageSize: query.pageSize, total, items };
  }

  async create(workspaceId: string, actorUserId: string, name: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const now = this.clock.now();
        const team = await tx.team.create({
          data: { workspaceId, name, createdAt: now, updatedAt: now },
          select: TEAM_SELECT,
        });
        await this.audit.append(tx, {
          actorUserId,
          objectType: 'TEAM',
          objectId: team.id,
          action: 'TEAM_CREATED',
          after: { name },
          at: now,
        });
        return team;
      });
    } catch (error) {
      throw mapDuplicateName(error, 'team');
    }
  }

  async get(teamId: string) {
    return this.prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: TEAM_SELECT,
    });
  }

  async rename(teamId: string, actorUserId: string, name: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [current] = await tx.$queryRaw<Array<{ name: string }>>`
          SELECT name FROM teams WHERE id = ${teamId}::uuid FOR UPDATE`;
        if (!current) throw teamNotFound();
        if (current.name === name) {
          return tx.team.findUniqueOrThrow({
            where: { id: teamId },
            select: TEAM_SELECT,
          });
        }
        const now = this.clock.now();
        const team = await tx.team.update({
          where: { id: teamId },
          data: { name, updatedAt: now },
          select: TEAM_SELECT,
        });
        await this.audit.append(tx, {
          actorUserId,
          objectType: 'TEAM',
          objectId: teamId,
          action: 'TEAM_RENAMED',
          before: { name: current.name },
          after: { name },
          at: now,
        });
        return team;
      });
    } catch (error) {
      throw mapDuplicateName(error, 'team');
    }
  }

  async listMembers(teamId: string, query: PageQuery) {
    const where = { teamId };
    const [total, rows] = await Promise.all([
      this.prisma.teamMembership.count({ where }),
      this.prisma.teamMembership.findMany({
        where,
        select: TEAM_MEMBERSHIP_SELECT,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: await formatTeamMemberships(this.prisma, rows),
    };
  }

  /** Người được thêm phải là thành viên ACTIVE của workspace chứa team. Membership cũ INACTIVE được kích hoạt lại. */
  async addMember(
    access: WorkspaceAccess,
    teamId: string,
    actorUserId: string,
    userId: string,
  ) {
    const workspaceMembership =
      await this.prisma.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: { workspaceId: access.workspaceId, userId },
        },
        select: { status: true },
      });
    if (workspaceMembership?.status !== 'ACTIVE') {
      const message = 'Tài khoản phải là thành viên ACTIVE của workspace.';
      throw new ApiException('VALIDATION_ERROR', 400, message, {
        fields: { userId: [message] },
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const now = this.clock.now();
        const [existing] = await tx.$queryRaw<LockedTeamMembership[]>`
          SELECT id, status::text AS status, main_role_id, version FROM team_memberships
          WHERE team_id = ${teamId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
        if (existing?.status === 'ACTIVE') {
          throw new ApiException(
            'UNIQUE_CONFLICT',
            409,
            'Tài khoản đã là thành viên của team.',
          );
        }
        const membershipId = existing
          ? (
              await tx.teamMembership.update({
                where: { id: existing.id },
                // C33-02.2: thêm lại team không khôi phục Main Role cũ; Manager đặt lại qua PATCH.
                data: {
                  status: 'ACTIVE',
                  mainRoleId: null,
                  version: { increment: 1 },
                  updatedAt: now,
                },
                select: { id: true },
              })
            ).id
          : (
              await tx.teamMembership.create({
                data: {
                  teamId,
                  userId,
                  status: 'ACTIVE',
                  createdAt: now,
                  updatedAt: now,
                },
                select: { id: true },
              })
            ).id;
        await this.audit.append(tx, {
          actorUserId,
          objectType: 'TEAM_MEMBERSHIP',
          objectId: membershipId,
          action: 'TEAM_MEMBER_ADDED',
          before: existing
            ? { status: existing.status, mainRoleId: existing.main_role_id }
            : null,
          after: { teamId, userId, status: 'ACTIVE', mainRoleId: null },
          at: now,
        });
        return getTeamMembershipOrThrow(tx, teamId, userId);
      });
    } catch (error) {
      // Hai request thêm cùng người cùng lúc: request sau va unique (team_id, user_id).
      if (isUniqueViolation(error)) {
        throw new ApiException(
          'UNIQUE_CONFLICT',
          409,
          'Tài khoản đã là thành viên của team.',
        );
      }
      throw error;
    }
  }

  /** Gỡ khỏi team: membership chuyển INACTIVE, giữ lịch sử. Không gỡ người đang là A của task chưa DONE trong team. */
  removeMember(teamId: string, actorUserId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await lockActiveTeamMembership(tx, teamId, userId);
      const openAccountableTasks = await tx.task.count({
        where: { teamId, accountableUserId: userId, status: { not: 'DONE' } },
      });
      if (openAccountableTasks > 0) {
        throw new ApiException(
          'RESPONSIBILITY_REQUIRED',
          422,
          'Thành viên đang là người chịu trách nhiệm (A) của task chưa hoàn thành trong team; hãy đổi A trước.',
          { openAccountableTaskCount: openAccountableTasks },
        );
      }
      const now = this.clock.now();
      await tx.teamMembership.update({
        where: { id: existing.id },
        data: { status: 'INACTIVE', version: { increment: 1 }, updatedAt: now },
      });
      await this.audit.append(tx, {
        actorUserId,
        objectType: 'TEAM_MEMBERSHIP',
        objectId: existing.id,
        action: 'TEAM_MEMBER_REMOVED',
        before: { status: 'ACTIVE' },
        after: { status: 'INACTIVE' },
        at: now,
      });
    });
  }

  /**
   * Đặt hoặc bỏ Main Role. Thứ tự kiểm theo C33-03.2: request (mainRoleId cùng workspace), expectedVersion,
   * rồi mới xét no-op. No-op không tăng version, không ghi audit (cùng cách với PUT my-skills).
   * Không đổi assignment hiện có.
   */
  setMainRole(
    access: WorkspaceAccess,
    teamId: string,
    actorUserId: string,
    userId: string,
    mainRoleId: string | null,
    expectedVersion: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await lockActiveTeamMembership(tx, teamId, userId);
      if (mainRoleId !== null) {
        const role = await tx.role.findUnique({
          where: { id: mainRoleId },
          select: { workspaceId: true },
        });
        if (role?.workspaceId !== access.workspaceId) {
          const message =
            'Main Role phải là role thuộc cùng workspace với team.';
          throw new ApiException('VALIDATION_ERROR', 400, message, {
            fields: { mainRoleId: [message] },
          });
        }
      }
      if (existing.version !== expectedVersion) {
        throw versionConflict(existing.version);
      }
      if (existing.main_role_id === mainRoleId) {
        return getTeamMembershipOrThrow(tx, teamId, userId);
      }
      const now = this.clock.now();
      await tx.teamMembership.update({
        where: { id: existing.id },
        data: { mainRoleId, version: { increment: 1 }, updatedAt: now },
      });
      await this.audit.append(tx, {
        actorUserId,
        objectType: 'TEAM_MEMBERSHIP',
        objectId: existing.id,
        action: 'TEAM_MEMBER_MAIN_ROLE_CHANGED',
        before: {
          mainRoleId: existing.main_role_id,
          version: existing.version,
        },
        after: { mainRoleId, version: existing.version + 1 },
        at: now,
      });
      return getTeamMembershipOrThrow(tx, teamId, userId);
    });
  }
}

async function lockActiveTeamMembership(
  tx: Db,
  teamId: string,
  userId: string,
): Promise<LockedTeamMembership> {
  const [existing] = await tx.$queryRaw<LockedTeamMembership[]>`
    SELECT id, status::text AS status, main_role_id, version FROM team_memberships
    WHERE team_id = ${teamId}::uuid AND user_id = ${userId}::uuid FOR UPDATE`;
  if (existing?.status !== 'ACTIVE') {
    throw new ApiException(
      'NOT_FOUND',
      404,
      'Không tìm thấy thành viên ACTIVE trong team.',
    );
  }
  return existing;
}

async function getTeamMembershipOrThrow(
  db: Db,
  teamId: string,
  userId: string,
) {
  const row = await db.teamMembership.findUniqueOrThrow({
    where: { teamId_userId: { teamId, userId } },
    select: TEAM_MEMBERSHIP_SELECT,
  });
  const [membership] = await formatTeamMemberships(db, [row]);
  return membership!;
}

/** workspaceRole lấy từ workspace_memberships; Main Role lấy theo team. */
async function formatTeamMemberships(db: Db, rows: TeamMembershipRow[]) {
  if (rows.length === 0) return [];
  const workspaceRoles = await db.workspaceMembership.findMany({
    where: {
      workspaceId: rows[0]!.team.workspaceId,
      userId: { in: rows.map((row) => row.userId) },
    },
    select: { userId: true, role: true },
  });
  const roleByUser = new Map(
    workspaceRoles.map((membership) => [membership.userId, membership.role]),
  );
  return rows.map((row) => ({
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    status: row.status,
    workspaceRole: roleByUser.get(row.userId) ?? 'MEMBER',
    mainRoleId: row.mainRoleId,
    mainRoleName: row.mainRole?.name ?? null,
    displayName: row.user.displayName,
    version: row.version,
  }));
}

export function mapDuplicateName(
  error: unknown,
  kind: 'team' | 'role' | 'skill',
): unknown {
  if (!isUniqueViolation(error)) return error;
  const label = { team: 'Team', role: 'Role', skill: 'Skill' }[kind];
  return new ApiException(
    'UNIQUE_CONFLICT',
    409,
    `${label} cùng tên (không phân biệt hoa thường) đã tồn tại trong workspace.`,
    { field: 'name' },
  );
}

function teamNotFound(): ApiException {
  return new ApiException(
    'NOT_FOUND',
    404,
    'Không tìm thấy team được yêu cầu.',
  );
}
