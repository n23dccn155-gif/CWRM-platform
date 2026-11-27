import { Global, Injectable, Module } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

export type AuditObjectType =
  | 'WORKSPACE_MEMBERSHIP'
  | 'WORKSPACE_INVITATION'
  | 'TEAM'
  | 'TEAM_MEMBERSHIP'
  | 'ROLE'
  | 'SKILL'
  | 'MEMBER_CAPACITY'
  | 'TASK';

export interface AuditEntry {
  /** null nghĩa là SYSTEM. */
  actorUserId: string | null;
  objectType: AuditObjectType;
  objectId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  at: Date;
}

/**
 * Audit append-only dùng chung (EST-02). Luôn ghi trong transaction của thay đổi nghiệp vụ,
 * để nghiệp vụ và audit cùng commit hoặc cùng rollback.
 */
@Injectable()
export class AuditService {
  async append(
    transaction: Prisma.TransactionClient,
    entry: AuditEntry,
  ): Promise<void> {
    await transaction.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        actorKind: entry.actorUserId ? 'USER' : 'SYSTEM',
        objectType: entry.objectType,
        objectId: entry.objectId,
        action: entry.action,
        beforeValue: toJson(entry.before),
        afterValue: toJson(entry.after),
        reason: entry.reason ?? null,
        createdAt: entry.at,
      },
    });
  }
}

function toJson(
  value: Record<string, unknown> | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value ? (value as Prisma.InputJsonValue) : Prisma.DbNull;
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
