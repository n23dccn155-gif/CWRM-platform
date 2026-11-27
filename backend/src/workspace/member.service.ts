import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { Clock } from '../common/clock.js';
import { ApiException } from '../common/errors/api.exception.js';
import { pageArgs, type PageQuery } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  formatMembership,
  MEMBERSHIP_SELECT,
  withSkills,
} from './membership.format.js';
import type { MembershipPatchRequest } from './member.dto.js';

type Db = Prisma.TransactionClient;

interface LockedMembership {
  id: string;
  user_id: string;
  role: 'MANAGER' | 'MEMBER';
  status: 'ACTIVE' | 'INACTIVE';
}

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  async list(workspaceId: string, query: PageQuery) {
    const where = { workspaceId };
    const [total, rows] = await Promise.all([
      this.prisma.workspaceMembership.count({ where }),
      this.prisma.workspaceMembership.findMany({
        where,
        select: MEMBERSHIP_SELECT,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: await withSkills(this.prisma, rows),
    };
  }

  async get(workspaceId: string, userId: string) {
    return getMembershipOrThrow(this.prisma, workspaceId, userId);
  }

  update(
    workspaceId: string,
    userId: string,
    actorUserId: string,
    input: MembershipPatchRequest,
  ) {
    if (input.role === undefined && input.status === undefined) {
      const message = 'Cần gửi ít nhất một trong hai trường role hoặc status.';
      throw new ApiException('VALIDATION_ERROR', 400, message, {
        fields: { request: [message] },
      });
    }
    return this.change(workspaceId, userId, actorUserId, {
      role: input.role,
      status: input.status,
      reason: input.reason ?? null,
      action: 'MEMBERSHIP_UPDATED',
    });
  }

  async remove(workspaceId: string, userId: string, actorUserId: string) {
    await this.change(workspaceId, userId, actorUserId, {
      status: 'INACTIVE',
      reason: null,
      action: 'MEMBERSHIP_REMOVED',
    });
  }

  /**
   * Đổi role/status trong một transaction. Khóa dòng của người bị đổi cùng mọi Manager ACTIVE theo thứ tự id,
   * nên hai request song song không thể cùng hạ hai Manager cuối (request sau đọc lại số Manager sau khi chờ khóa).
   */
  private change(
    workspaceId: string,
    userId: string,
    actorUserId: string,
    change: {
      role?: 'MANAGER' | 'MEMBER';
      status?: 'ACTIVE' | 'INACTIVE';
      reason: string | null;
      action: 'MEMBERSHIP_UPDATED' | 'MEMBERSHIP_REMOVED';
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<LockedMembership[]>`
        SELECT id, user_id, role::text AS role, status::text AS status
        FROM workspace_memberships
        WHERE workspace_id = ${workspaceId}::uuid
          AND (user_id = ${userId}::uuid OR (role = 'MANAGER' AND status = 'ACTIVE'))
        ORDER BY id
        FOR UPDATE`;
      const target = locked.find((row) => row.user_id === userId);
      if (!target) throw membershipNotFound();

      const nextRole = change.role ?? target.role;
      const nextStatus = change.status ?? target.status;
      if (nextRole === target.role && nextStatus === target.status) {
        return getMembershipOrThrow(tx, workspaceId, userId);
      }

      const wasActiveManager =
        target.role === 'MANAGER' && target.status === 'ACTIVE';
      const staysActiveManager =
        nextRole === 'MANAGER' && nextStatus === 'ACTIVE';
      if (wasActiveManager && !staysActiveManager) {
        const activeManagers = locked.filter(
          (row) => row.role === 'MANAGER' && row.status === 'ACTIVE',
        ).length;
        if (activeManagers <= 1) {
          throw new ApiException(
            'LAST_MANAGER_REQUIRED',
            422,
            'Workspace phải còn ít nhất một Manager ACTIVE.',
          );
        }
        await assertNotAccountable(tx, workspaceId, userId);
      }

      const now = this.clock.now();
      await tx.workspaceMembership.update({
        where: { id: target.id },
        data: { role: nextRole, status: nextStatus, updatedAt: now },
      });

      // Rời workspace thì rời luôn các team trong workspace đó; lịch sử membership được giữ.
      let deactivatedTeamIds: string[] = [];
      if (target.status === 'ACTIVE' && nextStatus === 'INACTIVE') {
        const teamMemberships = await tx.teamMembership.findMany({
          where: { userId, status: 'ACTIVE', team: { workspaceId } },
          select: { id: true, teamId: true },
        });
        deactivatedTeamIds = teamMemberships.map((row) => row.teamId);
        if (teamMemberships.length > 0) {
          await tx.teamMembership.updateMany({
            where: { id: { in: teamMemberships.map((row) => row.id) } },
            data: {
              status: 'INACTIVE',
              version: { increment: 1 },
              updatedAt: now,
            },
          });
        }
      }

      await this.audit.append(tx, {
        actorUserId,
        objectType: 'WORKSPACE_MEMBERSHIP',
        objectId: target.id,
        action: change.action,
        before: { role: target.role, status: target.status },
        after: {
          role: nextRole,
          status: nextStatus,
          ...(deactivatedTeamIds.length > 0 ? { deactivatedTeamIds } : {}),
        },
        reason: change.reason,
        at: now,
      });
      return getMembershipOrThrow(tx, workspaceId, userId);
    });
  }
}

/** A của task chưa DONE phải là Manager ACTIVE, nên không được hạ quyền hay vô hiệu hóa người đang là A. */
async function assertNotAccountable(
  db: Db,
  workspaceId: string,
  userId: string,
): Promise<void> {
  const openAccountableTasks = await db.task.count({
    where: {
      accountableUserId: userId,
      status: { not: 'DONE' },
      team: { workspaceId },
    },
  });
  if (openAccountableTasks > 0) {
    throw new ApiException(
      'RESPONSIBILITY_REQUIRED',
      422,
      'Thành viên đang là người chịu trách nhiệm (A) của task chưa hoàn thành; hãy đổi A trước.',
      { openAccountableTaskCount: openAccountableTasks },
    );
  }
}

export async function getMembershipOrThrow(
  db: Db,
  workspaceId: string,
  userId: string,
) {
  const row = await db.workspaceMembership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: MEMBERSHIP_SELECT,
  });
  if (!row) throw membershipNotFound();
  const [membership] = await withSkills(db, [row]);
  return membership ?? formatMembership(row, []);
}

function membershipNotFound(): ApiException {
  return new ApiException(
    'NOT_FOUND',
    404,
    'Không tìm thấy thành viên trong workspace.',
  );
}
