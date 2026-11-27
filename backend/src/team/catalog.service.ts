import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { Clock } from '../common/clock.js';
import { ApiException } from '../common/errors/api.exception.js';
import { isForeignKeyViolation } from '../common/errors/prisma-errors.js';
import { pageArgs, type PageQuery } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LabelRequest } from './team.dto.js';
import { versionConflict } from '../common/errors/version-conflict.js';
import { mapDuplicateName } from './team.service.js';

export type LabelKind = 'role' | 'skill';

const LABEL_SELECT = {
  id: true,
  workspaceId: true,
  name: true,
  description: true,
} as const;

export interface LabelRow {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
}

/**
 * Danh mục role chuyên môn và skill của workspace. Hai danh mục có cùng hình dạng (schema Label) nên dùng chung
 * một service; role/skill chỉ là nhãn, không cấp quyền hệ thống.
 */
@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  async list(kind: LabelKind, workspaceId: string, query: PageQuery) {
    const where = { workspaceId };
    const orderBy = [{ name: 'asc' as const }, { id: 'asc' as const }];
    const [total, items] =
      kind === 'role'
        ? await Promise.all([
            this.prisma.role.count({ where }),
            this.prisma.role.findMany({
              where,
              select: LABEL_SELECT,
              orderBy,
              ...pageArgs(query),
            }),
          ])
        : await Promise.all([
            this.prisma.skill.count({ where }),
            this.prisma.skill.findMany({
              where,
              select: LABEL_SELECT,
              orderBy,
              ...pageArgs(query),
            }),
          ]);
    return { page: query.page, pageSize: query.pageSize, total, items };
  }

  async create(
    kind: LabelKind,
    workspaceId: string,
    actorUserId: string,
    input: LabelRequest,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const now = this.clock.now();
        const data = {
          workspaceId,
          name: input.name,
          description: normalizeDescription(input.description) ?? null,
          createdAt: now,
          updatedAt: now,
        };
        const label: LabelRow =
          kind === 'role'
            ? await tx.role.create({ data, select: LABEL_SELECT })
            : await tx.skill.create({ data, select: LABEL_SELECT });
        await this.audit.append(tx, {
          actorUserId,
          objectType: objectType(kind),
          objectId: label.id,
          action: `${objectType(kind)}_CREATED`,
          after: { name: label.name, description: label.description },
          at: now,
        });
        return label;
      });
    } catch (error) {
      throw mapDuplicateName(error, kind);
    }
  }

  /** Đổi tên/mô tả không đổi role/eligibility của assignment đã nhận. Bỏ trống description thì giữ mô tả cũ. */
  async update(
    kind: LabelKind,
    id: string,
    actorUserId: string,
    input: LabelRequest,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const before = await lockLabel(tx, kind, id);
        const description = normalizeDescription(input.description);
        const next = {
          name: input.name,
          description:
            description === undefined ? before.description : description,
        };
        if (
          next.name === before.name &&
          next.description === before.description
        ) {
          return before;
        }
        const now = this.clock.now();
        const data = { ...next, updatedAt: now };
        const label: LabelRow =
          kind === 'role'
            ? await tx.role.update({
                where: { id },
                data,
                select: LABEL_SELECT,
              })
            : await tx.skill.update({
                where: { id },
                data,
                select: LABEL_SELECT,
              });
        await this.audit.append(tx, {
          actorUserId,
          objectType: objectType(kind),
          objectId: id,
          action: `${objectType(kind)}_UPDATED`,
          before: { name: before.name, description: before.description },
          after: next,
          at: now,
        });
        return label;
      });
    } catch (error) {
      throw mapDuplicateName(error, kind);
    }
  }

  /**
   * Xóa role/skill không còn được tham chiếu. Role: Main Role của team membership (kể cả INACTIVE, để giữ lịch sử)
   * và yêu cầu role của task. Skill: tập skill của Member và yêu cầu skill của task.
   */
  async remove(kind: LabelKind, id: string, actorUserId: string) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const before = await lockLabel(tx, kind, id);
        const references: Record<string, number> =
          kind === 'role'
            ? {
                teamMemberships: await tx.teamMembership.count({
                  where: { mainRoleId: id },
                }),
                tasks: await tx.taskRoleRequirement.count({
                  where: { roleId: id },
                }),
              }
            : {
                members: await tx.memberSkill.count({ where: { skillId: id } }),
                tasks: await tx.taskSkillRequirement.count({
                  where: { skillId: id },
                }),
              };
        if (Object.values(references).some((count) => count > 0)) {
          throw inUse(kind, references);
        }
        if (kind === 'role') await tx.role.delete({ where: { id } });
        else await tx.skill.delete({ where: { id } });
        await this.audit.append(tx, {
          actorUserId,
          objectType: objectType(kind),
          objectId: id,
          action: `${objectType(kind)}_DELETED`,
          before: { name: before.name, description: before.description },
          at: this.clock.now(),
        });
      });
    } catch (error) {
      // Tham chiếu mới chen vào sau lúc đếm vẫn bị khóa ngoại RESTRICT chặn.
      if (isForeignKeyViolation(error)) throw inUse(kind, {});
      throw error;
    }
  }

  /**
   * Member tự khai toàn bộ tập skill (P-01). Thứ tự kiểm: khóa membership → expectedVersion → skill thuộc workspace
   * → no-op. Version chỉ tăng khi tập đổi thật, tăng đúng 1, cùng transaction với việc ghi member_skills.
   */
  replaceMySkills(
    workspaceId: string,
    userId: string,
    skillIds: string[],
    expectedVersion: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const [membership] = await tx.$queryRaw<
        Array<{ id: string; skills_version: number }>
      >`
        SELECT id, skills_version FROM workspace_memberships
        WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${userId}::uuid AND status = 'ACTIVE'
        FOR UPDATE`;
      if (!membership) {
        throw new ApiException(
          'NOT_FOUND',
          404,
          'Không tìm thấy workspace được yêu cầu.',
        );
      }
      if (membership.skills_version !== expectedVersion) {
        throw versionConflict(membership.skills_version);
      }

      const requested = [...new Set(skillIds)].sort();
      if (requested.length > 0) {
        const found = await tx.skill.findMany({
          where: { workspaceId, id: { in: requested } },
          select: { id: true },
        });
        const known = new Set(found.map((skill) => skill.id));
        const unknown = requested.filter((id) => !known.has(id));
        if (unknown.length > 0) {
          const message = 'Có skill không thuộc workspace này.';
          throw new ApiException('VALIDATION_ERROR', 400, message, {
            fields: { skillIds: [message] },
            unknownSkillIds: unknown,
          });
        }
      }

      const current = (
        await tx.memberSkill.findMany({
          where: { workspaceId, userId },
          select: { skillId: true },
        })
      )
        .map((row) => row.skillId)
        .sort();
      if (sameSet(current, requested)) {
        return { skillIds: current, version: membership.skills_version };
      }

      const now = this.clock.now();
      await tx.memberSkill.deleteMany({ where: { workspaceId, userId } });
      if (requested.length > 0) {
        await tx.memberSkill.createMany({
          data: requested.map((skillId) => ({
            workspaceId,
            userId,
            skillId,
            createdAt: now,
          })),
        });
      }
      const nextVersion = membership.skills_version + 1;
      await tx.workspaceMembership.update({
        where: { id: membership.id },
        data: { skillsVersion: nextVersion, updatedAt: now },
      });
      await this.audit.append(tx, {
        actorUserId: userId,
        objectType: 'WORKSPACE_MEMBERSHIP',
        objectId: membership.id,
        action: 'MEMBER_SKILLS_REPLACED',
        before: { skillIds: current, skillsVersion: membership.skills_version },
        after: { skillIds: requested, skillsVersion: nextVersion },
        at: now,
      });
      return { skillIds: requested, version: nextVersion };
    });
  }
}

async function lockLabel(
  tx: Prisma.TransactionClient,
  kind: LabelKind,
  id: string,
): Promise<LabelRow> {
  const rows =
    kind === 'role'
      ? await tx.$queryRaw<LabelRow[]>`
          SELECT id, workspace_id AS "workspaceId", name, description
          FROM roles WHERE id = ${id}::uuid FOR UPDATE`
      : await tx.$queryRaw<LabelRow[]>`
          SELECT id, workspace_id AS "workspaceId", name, description
          FROM skills WHERE id = ${id}::uuid FOR UPDATE`;
  const label = rows[0];
  if (!label) {
    throw new ApiException(
      'NOT_FOUND',
      404,
      `Không tìm thấy ${kind} được yêu cầu.`,
    );
  }
  return label;
}

/** undefined: không gửi (giữ nguyên khi sửa); chuỗi rỗng: xóa mô tả. */
function normalizeDescription(
  value: string | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  return value === '' ? null : value;
}

function objectType(kind: LabelKind): 'ROLE' | 'SKILL' {
  return kind === 'role' ? 'ROLE' : 'SKILL';
}

function inUse(kind: LabelKind, references: Record<string, number>) {
  return new ApiException(
    'UNIQUE_CONFLICT',
    409,
    kind === 'role'
      ? 'Role đang được dùng làm Main Role hoặc yêu cầu của task nên không xóa được.'
      : 'Skill đang được Member khai hoặc được task yêu cầu nên không xóa được.',
    { reason: 'IN_USE', references },
  );
}

function sameSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((id, index) => id === right[index])
  );
}
