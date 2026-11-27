import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { Clock } from '../common/clock.js';
import { ApiException } from '../common/errors/api.exception.js';
import { pageArgs, type PageQuery } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { getMembershipOrThrow } from './member.service.js';

const INVITATION_SELECT = {
  id: true,
  workspaceId: true,
  invitedUserId: true,
  invitedByUserId: true,
  status: true,
  createdAt: true,
  workspace: { select: { name: true } },
} as const;

type InvitationRow = Prisma.WorkspaceInvitationGetPayload<{
  select: typeof INVITATION_SELECT;
}>;

interface LockedInvitation {
  id: string;
  workspace_id: string;
  invited_user_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  async listForWorkspace(workspaceId: string, query: PageQuery) {
    return this.page({ workspaceId }, query);
  }

  async listMine(userId: string, query: PageQuery) {
    return this.page({ invitedUserId: userId }, query);
  }

  /**
   * Tạo lời mời trong ứng dụng, không gửi email. Khóa dòng workspace để hai Manager mời cùng một người
   * cùng lúc không tạo hai lời mời PENDING.
   */
  async create(workspaceId: string, actorUserId: string, email: string) {
    const invitee = await this.prisma.account.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });
    if (!invitee?.isActive) {
      throw new ApiException(
        'INVITEE_NOT_REGISTERED',
        422,
        'Chỉ mời được tài khoản đã đăng ký và đang hoạt động.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
      const membership = await tx.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: invitee.id } },
        select: { status: true },
      });
      if (membership?.status === 'ACTIVE') {
        throw new ApiException(
          'UNIQUE_CONFLICT',
          409,
          'Tài khoản này đã là thành viên của workspace.',
          { reason: 'ALREADY_MEMBER' },
        );
      }
      const pending = await tx.workspaceInvitation.findFirst({
        where: { workspaceId, invitedUserId: invitee.id, status: 'PENDING' },
        select: { id: true },
      });
      if (pending) {
        throw new ApiException(
          'UNIQUE_CONFLICT',
          409,
          'Tài khoản này đang có lời mời chờ phản hồi.',
          { reason: 'INVITATION_PENDING', invitationId: pending.id },
        );
      }

      const now = this.clock.now();
      const invitation = await tx.workspaceInvitation.create({
        data: {
          workspaceId,
          invitedUserId: invitee.id,
          invitedByUserId: actorUserId,
          status: 'PENDING',
          createdAt: now,
        },
        select: INVITATION_SELECT,
      });
      await this.audit.append(tx, {
        actorUserId,
        objectType: 'WORKSPACE_INVITATION',
        objectId: invitation.id,
        action: 'INVITATION_CREATED',
        after: { invitedUserId: invitee.id, status: 'PENDING' },
        at: now,
      });
      return formatInvitation(invitation);
    });
  }

  /** Accept tạo membership MEMBER ACTIVE (hoặc kích hoạt lại membership cũ) cùng transaction với việc đóng lời mời. */
  accept(invitationId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await this.lockOwnPending(tx, invitationId, userId);
      const now = this.clock.now();
      const existing = await tx.workspaceMembership.findUnique({
        where: {
          workspaceId_userId: { workspaceId: invitation.workspace_id, userId },
        },
        select: { id: true, role: true, status: true },
      });

      let membershipId: string;
      if (!existing) {
        const created = await tx.workspaceMembership.create({
          data: {
            workspaceId: invitation.workspace_id,
            userId,
            role: 'MEMBER',
            status: 'ACTIVE',
            createdAt: now,
            updatedAt: now,
          },
          select: { id: true },
        });
        membershipId = created.id;
      } else {
        membershipId = existing.id;
        if (existing.status !== 'ACTIVE') {
          await tx.workspaceMembership.update({
            where: { id: existing.id },
            data: { role: 'MEMBER', status: 'ACTIVE', updatedAt: now },
          });
        }
      }

      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', respondedAt: now },
      });
      await this.audit.append(tx, {
        actorUserId: userId,
        objectType: 'WORKSPACE_INVITATION',
        objectId: invitation.id,
        action: 'INVITATION_ACCEPTED',
        before: { status: 'PENDING' },
        after: { status: 'ACCEPTED' },
        at: now,
      });
      if (existing?.status !== 'ACTIVE') {
        await this.audit.append(tx, {
          actorUserId: userId,
          objectType: 'WORKSPACE_MEMBERSHIP',
          objectId: membershipId,
          action: 'MEMBERSHIP_JOINED',
          before: existing
            ? { role: existing.role, status: existing.status }
            : null,
          after: { role: 'MEMBER', status: 'ACTIVE', invitationId },
          at: now,
        });
      }
      return getMembershipOrThrow(tx, invitation.workspace_id, userId);
    });
  }

  decline(invitationId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await this.lockOwnPending(tx, invitationId, userId);
      const now = this.clock.now();
      const updated = await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'DECLINED', respondedAt: now },
        select: INVITATION_SELECT,
      });
      await this.audit.append(tx, {
        actorUserId: userId,
        objectType: 'WORKSPACE_INVITATION',
        objectId: invitation.id,
        action: 'INVITATION_DECLINED',
        before: { status: 'PENDING' },
        after: { status: 'DECLINED' },
        at: now,
      });
      return formatInvitation(updated);
    });
  }

  /** Lời mời của người khác trả 404 giống lời mời không tồn tại; lời mời đã phản hồi trả 422. */
  private async lockOwnPending(
    tx: Prisma.TransactionClient,
    invitationId: string,
    userId: string,
  ): Promise<LockedInvitation> {
    const [invitation] = await tx.$queryRaw<LockedInvitation[]>`
      SELECT id, workspace_id, invited_user_id, status::text AS status
      FROM workspace_invitations WHERE id = ${invitationId}::uuid FOR UPDATE`;
    if (!invitation || invitation.invited_user_id !== userId) {
      throw new ApiException(
        'NOT_FOUND',
        404,
        'Không tìm thấy lời mời được yêu cầu.',
      );
    }
    if (invitation.status !== 'PENDING') {
      throw new ApiException(
        'INVALID_STATE_TRANSITION',
        422,
        'Lời mời đã được phản hồi trước đó.',
        { currentStatus: invitation.status },
      );
    }
    return invitation;
  }

  private async page(
    where: Prisma.WorkspaceInvitationWhereInput,
    query: PageQuery,
  ) {
    const [total, rows] = await Promise.all([
      this.prisma.workspaceInvitation.count({ where }),
      this.prisma.workspaceInvitation.findMany({
        where,
        select: INVITATION_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: rows.map(formatInvitation),
    };
  }
}

function formatInvitation(row: InvitationRow) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    workspaceName: row.workspace.name,
    invitedUserId: row.invitedUserId,
    invitedByUserId: row.invitedByUserId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}
