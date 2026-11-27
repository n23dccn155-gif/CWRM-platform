import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { Clock } from '../common/clock.js';
import { ApiException } from '../common/errors/api.exception.js';
import { isUniqueViolation } from '../common/errors/prisma-errors.js';
import { pageArgs, type PageQuery } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { versionConflict } from '../common/errors/version-conflict.js';

const CAPACITY_SELECT = {
  id: true,
  workspaceId: true,
  userId: true,
  declaredWeeklyHours: true,
  declaredAt: true,
  approvedWeeklyHours: true,
  approvedByUserId: true,
  approvedAt: true,
  status: true,
  version: true,
  user: { select: { displayName: true } },
} as const;

type CapacityRow = Prisma.MemberCapacityGetPayload<{
  select: typeof CAPACITY_SELECT;
}>;

interface LockedCapacity {
  id: string;
  status: 'PENDING_APPROVAL' | 'APPROVED';
  version: number;
  declared_weekly_hours: string;
  approved_weekly_hours: string | null;
}

/**
 * Capacity tuần: Member khai, Manager duyệt. Khai lại đưa về PENDING_APPROVAL nhưng giữ nguyên số đã duyệt,
 * vì số đã duyệt vẫn là đầu vào R09 cho tới khi Manager duyệt số mới. NOT_DECLARED là không có dòng.
 */
@Injectable()
export class CapacityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  async getMine(workspaceId: string, userId: string) {
    const row = await this.prisma.memberCapacity.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      select: CAPACITY_SELECT,
    });
    if (row) return formatCapacity(row);
    const account = await this.prisma.account.findUniqueOrThrow({
      where: { id: userId },
      select: { displayName: true },
    });
    return {
      workspaceId,
      userId,
      displayName: account.displayName,
      declaredWeeklyHours: null,
      declaredAt: null,
      approvedWeeklyHours: null,
      approvedByUserId: null,
      approvedAt: null,
      status: 'NOT_DECLARED' as const,
      version: 0,
    };
  }

  async declare(
    workspaceId: string,
    userId: string,
    hours: number,
    expectedVersion: number,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const [current] = await lockCapacity(tx, workspaceId, userId);
        const currentVersion = current?.version ?? 0;
        if (currentVersion !== expectedVersion) {
          throw versionConflict(currentVersion);
        }
        const now = this.clock.now();
        const row = current
          ? await tx.memberCapacity.update({
              where: { id: current.id },
              data: {
                declaredWeeklyHours: hours,
                declaredAt: now,
                status: 'PENDING_APPROVAL',
                version: { increment: 1 },
                updatedAt: now,
              },
              select: CAPACITY_SELECT,
            })
          : await tx.memberCapacity.create({
              data: {
                workspaceId,
                userId,
                declaredWeeklyHours: hours,
                declaredAt: now,
                status: 'PENDING_APPROVAL',
                version: 1,
                createdAt: now,
                updatedAt: now,
              },
              select: CAPACITY_SELECT,
            });
        await this.audit.append(tx, {
          actorUserId: userId,
          objectType: 'MEMBER_CAPACITY',
          objectId: row.id,
          action: 'CAPACITY_DECLARED',
          before: current
            ? {
                status: current.status,
                declaredWeeklyHours: Number(current.declared_weekly_hours),
                approvedWeeklyHours: toNumber(current.approved_weekly_hours),
                version: current.version,
              }
            : null,
          after: {
            status: 'PENDING_APPROVAL',
            declaredWeeklyHours: hours,
            approvedWeeklyHours: toNumber(row.approvedWeeklyHours),
            version: row.version,
          },
          at: now,
        });
        return formatCapacity(row);
      });
    } catch (error) {
      // Hai lần khai báo đầu tiên chạy song song: lần sau va unique (workspace_id, user_id).
      if (isUniqueViolation(error)) throw versionConflict(1);
      throw error;
    }
  }

  async list(workspaceId: string, query: PageQuery) {
    const where = { workspaceId };
    const [total, rows] = await Promise.all([
      this.prisma.memberCapacity.count({ where }),
      this.prisma.memberCapacity.findMany({
        where,
        select: CAPACITY_SELECT,
        // PENDING_APPROVAL đứng trước APPROVED theo thứ tự khai báo của enum, để Manager thấy việc chờ duyệt trước.
        orderBy: [{ status: 'asc' }, { declaredAt: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: rows.map(formatCapacity),
    };
  }

  approve(
    workspaceId: string,
    targetUserId: string,
    actorUserId: string,
    hours: number,
    expectedVersion: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const membership = await tx.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
        select: { status: true },
      });
      if (membership?.status !== 'ACTIVE') {
        throw new ApiException(
          'NOT_FOUND',
          404,
          'Không tìm thấy thành viên trong workspace.',
        );
      }
      const [current] = await lockCapacity(tx, workspaceId, targetUserId);
      if (!current) {
        throw new ApiException(
          'INVALID_STATE_TRANSITION',
          422,
          'Thành viên chưa khai báo capacity tuần nên chưa có gì để duyệt.',
          { currentStatus: 'NOT_DECLARED' },
        );
      }
      if (current.version !== expectedVersion) {
        throw versionConflict(current.version);
      }
      if (current.status !== 'PENDING_APPROVAL') {
        throw new ApiException(
          'INVALID_STATE_TRANSITION',
          422,
          'Chỉ duyệt được capacity đang chờ duyệt.',
          { currentStatus: current.status },
        );
      }
      const now = this.clock.now();
      const row = await tx.memberCapacity.update({
        where: { id: current.id },
        data: {
          approvedWeeklyHours: hours,
          approvedByUserId: actorUserId,
          approvedAt: now,
          status: 'APPROVED',
          version: { increment: 1 },
          updatedAt: now,
        },
        select: CAPACITY_SELECT,
      });
      await this.audit.append(tx, {
        actorUserId,
        objectType: 'MEMBER_CAPACITY',
        objectId: current.id,
        action: 'CAPACITY_APPROVED',
        before: {
          status: current.status,
          declaredWeeklyHours: Number(current.declared_weekly_hours),
          approvedWeeklyHours: toNumber(current.approved_weekly_hours),
          version: current.version,
        },
        after: {
          status: 'APPROVED',
          approvedWeeklyHours: hours,
          version: row.version,
        },
        at: now,
      });
      // Đánh giá lại R09 cho các task của Member sau commit thuộc WP-037 (risk adapter); module risk chưa có.
      return formatCapacity(row);
    });
  }
}

function lockCapacity(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  userId: string,
) {
  return tx.$queryRaw<LockedCapacity[]>`
    SELECT id, status::text AS status, version,
           declared_weekly_hours::text AS declared_weekly_hours,
           approved_weekly_hours::text AS approved_weekly_hours
    FROM member_capacities
    WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${userId}::uuid
    FOR UPDATE`;
}

function formatCapacity(row: CapacityRow) {
  return {
    workspaceId: row.workspaceId,
    userId: row.userId,
    displayName: row.user.displayName,
    declaredWeeklyHours: Number(row.declaredWeeklyHours),
    declaredAt: row.declaredAt.toISOString(),
    approvedWeeklyHours: toNumber(row.approvedWeeklyHours),
    approvedByUserId: row.approvedByUserId,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    status: row.status,
    version: row.version,
  };
}

function toNumber(
  value: { toString(): string } | string | null,
): number | null {
  return value === null ? null : Number(value.toString());
}
