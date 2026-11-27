import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { Clock } from '../common/clock.js';
import { ApiException } from '../common/errors/api.exception.js';
import { versionConflict } from '../common/errors/version-conflict.js';
import { pageArgs } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { WorkspaceAccess } from '../workspace/workspace.decorators.js';
import type {
  RequiredPeoplePatchRequest,
  TaskCreateRequest,
  TaskListQuery,
  TaskPatchRequest,
} from './task.dto.js';

type Db = Prisma.TransactionClient;

const TASK_SELECT = {
  id: true,
  teamId: true,
  milestoneId: true,
  accountableUserId: true,
  title: true,
  description: true,
  status: true,
  assignmentMode: true,
  openWorkOpenedAt: true,
  openWorkClosedAt: true,
  openWorkClosedReason: true,
  priority: true,
  deadlineAt: true,
  deadlineType: true,
  effortEstimateHours: true,
  effortActualHours: true,
  requiredPeople: true,
  progress: true,
  resultText: true,
  resultUrl: true,
  startedAt: true,
  currentInProgressSince: true,
  lastQualifyingActivityAt: true,
  lastQualifyingActivityType: true,
  currentReviewSince: true,
  completedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  team: { select: { name: true } },
  milestone: { select: { name: true } },
  accountableMembership: {
    select: { user: { select: { displayName: true } } },
  },
  roleRequirements: { select: { roleId: true }, orderBy: { roleId: 'asc' } },
  skillRequirements: { select: { skillId: true }, orderBy: { skillId: 'asc' } },
} as const;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_SELECT }>;

/** Bộ lọc của GET /tasks cần module chưa triển khai (P-02 của 0.3.4-draft, EST-03). */
const UNSUPPORTED_FILTERS = [
  'openWorkState',
  'responsibleUserId',
  'riskLevel',
] as const;

interface LockedTask {
  id: string;
  team_id: string;
  status: string;
  deadline_type: 'FIXED' | 'FLEXIBLE';
  version: number;
}

/** Các trường sửa được qua PATCH /tasks/{taskId}, theo TaskPatchRequest. */
const PATCHABLE_FIELDS = [
  'title',
  'description',
  'milestoneId',
  'priority',
  'deadlineAt',
  'deadlineType',
  'effortEstimateHours',
  'requiredRoleIds',
  'requiredSkillIds',
] as const;
type PatchableField = (typeof PATCHABLE_FIELDS)[number];

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly clock: Clock,
  ) {}

  /**
   * MANAGER thấy task của mọi team trong workspace, MEMBER chỉ task của team mình đang là thành viên ACTIVE.
   * Validation và kiểm quyền chạy trước (guard, ValidationPipe); sau đó bộ lọc chưa hỗ trợ trả 422 cho cả request.
   */
  async list(access: WorkspaceAccess, userId: string, query: TaskListQuery) {
    const unsupported = UNSUPPORTED_FILTERS.filter(
      (name) => query[name] !== undefined,
    );
    if (unsupported.length > 0) {
      throw new ApiException(
        'FILTER_NOT_AVAILABLE',
        422,
        'Bộ lọc này chưa được hỗ trợ vì module nguồn chưa triển khai.',
        { unsupportedFilters: [...unsupported].sort() },
      );
    }

    const where: Prisma.TaskWhereInput = {
      team: {
        workspaceId: access.workspaceId,
        ...(access.role === 'MANAGER'
          ? {}
          : { memberships: { some: { userId, status: 'ACTIVE' } } }),
      },
      ...(query.teamId ? { teamId: query.teamId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assignmentMode ? { assignmentMode: query.assignmentMode } : {}),
      ...(query.accountableUserId
        ? { accountableUserId: query.accountableUserId }
        : {}),
      ...(query.deadlineBefore || query.deadlineAfter
        ? {
            deadlineAt: {
              ...(query.deadlineBefore
                ? { lt: new Date(query.deadlineBefore) }
                : {}),
              ...(query.deadlineAfter
                ? { gte: new Date(query.deadlineAfter) }
                : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        select: TASK_SELECT,
        orderBy: [{ deadlineAt: 'asc' }, { id: 'asc' }],
        ...pageArgs(query),
      }),
    ]);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: rows.map((row) => formatTask(row, access.role)),
    };
  }

  async get(taskId: string, access: WorkspaceAccess) {
    const row = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      select: TASK_SELECT,
    });
    return formatTask(row, access.role);
  }

  /**
   * Workspace lấy từ teamId trong body. Team ngoài phạm vi caller được thấy trả 400 như tham chiếu sai (C33-01.3);
   * thấy team mà không phải Manager trả 403. A được khóa FOR SHARE để không bị hạ quyền giữa lúc kiểm và lúc ghi.
   */
  async create(actorUserId: string, input: TaskCreateRequest) {
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({
        where: { id: input.teamId },
        select: { workspaceId: true },
      });
      const caller = team
        ? await tx.workspaceMembership.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId: team.workspaceId,
                userId: actorUserId,
              },
            },
            select: { role: true, status: true },
          })
        : null;
      const callerInTeam =
        caller?.status === 'ACTIVE' &&
        (caller.role === 'MANAGER' ||
          (
            await tx.teamMembership.findUnique({
              where: {
                teamId_userId: { teamId: input.teamId, userId: actorUserId },
              },
              select: { status: true },
            })
          )?.status === 'ACTIVE');
      if (!team || !callerInTeam) {
        throw referenceError('teamId', 'Không tìm thấy team được yêu cầu.');
      }
      if (caller?.role !== 'MANAGER') {
        throw new ApiException(
          'FORBIDDEN',
          403,
          'Bạn không có quyền thực hiện thao tác này.',
        );
      }
      const workspaceId = team.workspaceId;

      await assertAccountableManager(
        tx,
        workspaceId,
        input.teamId,
        input.accountableUserId,
      );
      if (input.milestoneId !== undefined) {
        await assertMilestone(tx, workspaceId, input.teamId, input.milestoneId);
      }
      const roleIds = input.requiredRoleIds ?? [];
      const skillIds = input.requiredSkillIds ?? [];
      await assertLabels(tx, workspaceId, roleIds, skillIds);

      const now = this.clock.now();
      const task = await tx.task.create({
        data: {
          teamId: input.teamId,
          milestoneId: input.milestoneId ?? null,
          accountableUserId: input.accountableUserId,
          title: input.title,
          description: input.description ?? null,
          status: 'TO_DO',
          assignmentMode: input.assignmentMode,
          priority: input.priority,
          deadlineAt: new Date(input.deadlineAt),
          deadlineType: input.deadlineType,
          effortEstimateHours: input.effortEstimateHours ?? null,
          requiredPeople: input.requiredPeople,
          progress: 0,
          version: 1,
          createdAt: now,
          updatedAt: now,
          roleRequirements: {
            create: roleIds.map((roleId) => ({ roleId, createdAt: now })),
          },
          skillRequirements: {
            create: skillIds.map((skillId) => ({ skillId, createdAt: now })),
          },
        },
        select: TASK_SELECT,
      });
      await this.audit.append(tx, {
        actorUserId,
        objectType: 'TASK',
        objectId: task.id,
        action: 'TASK_CREATED',
        after: auditSnapshot(task),
        at: now,
      });
      return formatTask(task, 'MANAGER');
    });
  }

  /**
   * Thứ tự kiểm (theo C33-03.2 của WP-014B): request (tham chiếu milestone/role/skill), expectedVersion,
   * trạng thái (DONE không sửa), lý do khi đổi deadline FIXED, rồi mới xét no-op. No-op không tăng version,
   * không ghi audit.
   */
  update(
    taskId: string,
    access: WorkspaceAccess,
    actorUserId: string,
    input: TaskPatchRequest,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await lockTask(tx, taskId);
      if (input.milestoneId !== undefined && input.milestoneId !== null) {
        await assertMilestone(
          tx,
          access.workspaceId,
          locked.team_id,
          input.milestoneId,
        );
      }
      await assertLabels(
        tx,
        access.workspaceId,
        input.requiredRoleIds ?? [],
        input.requiredSkillIds ?? [],
      );
      if (locked.version !== input.expectedVersion) {
        throw versionConflict(locked.version);
      }
      assertNotDone(locked.status);

      const current = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        select: TASK_SELECT,
      });
      const before = patchView(current);
      const changed = PATCHABLE_FIELDS.filter(
        (field) =>
          input[field] !== undefined &&
          !sameValue(field, before[field], input[field]),
      );
      const deadlineChanged =
        changed.includes('deadlineAt') || changed.includes('deadlineType');
      if (
        locked.deadline_type === 'FIXED' &&
        deadlineChanged &&
        !input.reason
      ) {
        const message = 'Đổi deadline của task FIXED cần ghi lý do (reason).';
        throw new ApiException('VALIDATION_ERROR', 400, message, {
          fields: { reason: [message] },
        });
      }
      if (changed.length === 0) return formatTask(current, access.role);

      const now = this.clock.now();
      const has = (field: PatchableField) => changed.includes(field);
      await tx.task.update({
        where: { id: taskId },
        data: {
          ...(has('title') ? { title: input.title } : {}),
          ...(has('description') ? { description: input.description } : {}),
          ...(has('milestoneId') ? { milestoneId: input.milestoneId } : {}),
          ...(has('priority') ? { priority: input.priority } : {}),
          ...(has('deadlineAt')
            ? { deadlineAt: new Date(input.deadlineAt!) }
            : {}),
          ...(has('deadlineType') ? { deadlineType: input.deadlineType } : {}),
          ...(has('effortEstimateHours')
            ? { effortEstimateHours: input.effortEstimateHours }
            : {}),
          version: { increment: 1 },
          updatedAt: now,
        },
      });
      if (has('requiredRoleIds')) {
        await tx.taskRoleRequirement.deleteMany({ where: { taskId } });
        await tx.taskRoleRequirement.createMany({
          data: input.requiredRoleIds!.map((roleId) => ({
            taskId,
            roleId,
            createdAt: now,
          })),
        });
      }
      if (has('requiredSkillIds')) {
        await tx.taskSkillRequirement.deleteMany({ where: { taskId } });
        await tx.taskSkillRequirement.createMany({
          data: input.requiredSkillIds!.map((skillId) => ({
            taskId,
            skillId,
            createdAt: now,
          })),
        });
      }
      const updated = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        select: TASK_SELECT,
      });
      const after = patchView(updated);
      await this.audit.append(tx, {
        actorUserId,
        objectType: 'TASK',
        objectId: taskId,
        action: 'TASK_UPDATED',
        before: {
          ...pick(before, changed),
          version: current.version,
        },
        after: { ...pick(after, changed), version: updated.version },
        reason: input.reason ?? null,
        at: now,
      });
      return formatTask(updated, access.role);
    });
  }

  /**
   * Chưa có assignment (WP-024A/B) nên chưa có chỗ Accepted hay Direct Pending nào để chặn giảm;
   * guard đó thêm cùng module assignment.
   */
  updateRequiredPeople(
    taskId: string,
    access: WorkspaceAccess,
    actorUserId: string,
    input: RequiredPeoplePatchRequest,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await lockTask(tx, taskId);
      if (locked.version !== input.expectedVersion) {
        throw versionConflict(locked.version);
      }
      assertNotDone(locked.status);
      const current = await tx.task.findUniqueOrThrow({
        where: { id: taskId },
        select: TASK_SELECT,
      });
      if (current.requiredPeople === input.requiredPeople) {
        return formatTask(current, access.role);
      }
      const now = this.clock.now();
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          requiredPeople: input.requiredPeople,
          version: { increment: 1 },
          updatedAt: now,
        },
        select: TASK_SELECT,
      });
      await this.audit.append(tx, {
        actorUserId,
        objectType: 'TASK',
        objectId: taskId,
        action: 'TASK_REQUIRED_PEOPLE_CHANGED',
        before: {
          requiredPeople: current.requiredPeople,
          version: current.version,
        },
        after: {
          requiredPeople: updated.requiredPeople,
          version: updated.version,
        },
        at: now,
      });
      return formatTask(updated, access.role);
    });
  }
}

async function lockTask(tx: Db, taskId: string): Promise<LockedTask> {
  const [row] = await tx.$queryRaw<LockedTask[]>`
    SELECT id, team_id, status::text AS status, deadline_type::text AS deadline_type, version
    FROM tasks WHERE id = ${taskId}::uuid FOR UPDATE`;
  if (!row) {
    throw new ApiException(
      'NOT_FOUND',
      404,
      'Không tìm thấy task được yêu cầu.',
    );
  }
  return row;
}

function assertNotDone(status: string): void {
  if (status === 'DONE') {
    throw new ApiException(
      'INVALID_STATE_TRANSITION',
      422,
      'Task đã DONE nên không sửa được.',
      { currentStatus: status },
    );
  }
}

/**
 * A phải là Manager ACTIVE của workspace và thành viên ACTIVE của team. Khóa FOR SHARE hai dòng membership,
 * nên request hạ quyền hay gỡ người này (khóa FOR UPDATE ở MemberService/TeamService) phải chờ transaction này.
 */
async function assertAccountableManager(
  tx: Db,
  workspaceId: string,
  teamId: string,
  userId: string,
): Promise<void> {
  const [workspaceRow] = await tx.$queryRaw<
    Array<{ role: string; status: string }>
  >`
    SELECT role::text AS role, status::text AS status FROM workspace_memberships
    WHERE workspace_id = ${workspaceId}::uuid AND user_id = ${userId}::uuid FOR SHARE`;
  const [teamRow] = await tx.$queryRaw<Array<{ status: string }>>`
    SELECT status::text AS status FROM team_memberships
    WHERE team_id = ${teamId}::uuid AND user_id = ${userId}::uuid FOR SHARE`;
  if (
    workspaceRow?.role !== 'MANAGER' ||
    workspaceRow.status !== 'ACTIVE' ||
    teamRow?.status !== 'ACTIVE'
  ) {
    throw new ApiException(
      'ACCOUNTABLE_NOT_MANAGER',
      422,
      'Người chịu trách nhiệm (A) phải là Manager ACTIVE của workspace và thành viên ACTIVE của team.',
      { accountableUserId: userId },
    );
  }
}

/** Milestone không có hoặc thuộc workspace khác là tham chiếu sai (400); cùng workspace nhưng khác team là 422. */
async function assertMilestone(
  tx: Db,
  workspaceId: string,
  teamId: string,
  milestoneId: string,
): Promise<void> {
  const milestone = await tx.milestone.findUnique({
    where: { id: milestoneId },
    select: { teamId: true, team: { select: { workspaceId: true } } },
  });
  if (milestone?.team.workspaceId !== workspaceId) {
    throw referenceError(
      'milestoneId',
      'Không tìm thấy milestone được yêu cầu.',
    );
  }
  if (milestone.teamId !== teamId) {
    throw new ApiException(
      'MILESTONE_TEAM_MISMATCH',
      422,
      'Milestone phải thuộc cùng team với task.',
    );
  }
}

/** Role/skill yêu cầu phải thuộc workspace; sai thì 400 kèm danh sách ID không hợp lệ, không ghi một phần. */
async function assertLabels(
  tx: Db,
  workspaceId: string,
  roleIds: string[],
  skillIds: string[],
): Promise<void> {
  const [roles, skills] = await Promise.all([
    roleIds.length
      ? tx.role.findMany({
          where: { id: { in: roleIds }, workspaceId },
          select: { id: true },
        })
      : [],
    skillIds.length
      ? tx.skill.findMany({
          where: { id: { in: skillIds }, workspaceId },
          select: { id: true },
        })
      : [],
  ]);
  const knownRoles = new Set(roles.map((row) => row.id));
  const knownSkills = new Set(skills.map((row) => row.id));
  const unknownRoleIds = roleIds.filter((id) => !knownRoles.has(id));
  const unknownSkillIds = skillIds.filter((id) => !knownSkills.has(id));
  if (unknownRoleIds.length === 0 && unknownSkillIds.length === 0) return;

  const fields: Record<string, string[]> = {};
  if (unknownRoleIds.length) {
    fields.requiredRoleIds = ['Có role không thuộc workspace.'];
  }
  if (unknownSkillIds.length) {
    fields.requiredSkillIds = ['Có skill không thuộc workspace.'];
  }
  throw new ApiException(
    'VALIDATION_ERROR',
    400,
    'Có role hoặc skill không thuộc workspace.',
    {
      fields,
      ...(unknownRoleIds.length ? { unknownRoleIds } : {}),
      ...(unknownSkillIds.length ? { unknownSkillIds } : {}),
    },
  );
}

function referenceError(field: string, message: string): ApiException {
  return new ApiException('VALIDATION_ERROR', 400, message, {
    fields: { [field]: [message] },
  });
}

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

/** Giá trị hiện tại của các trường sửa được, ở dạng so sánh được với request. */
function patchView(row: TaskRow): Record<PatchableField, unknown> {
  return {
    title: row.title,
    description: row.description,
    milestoneId: row.milestoneId,
    priority: row.priority,
    deadlineAt: row.deadlineAt.toISOString(),
    deadlineType: row.deadlineType,
    effortEstimateHours: toNumber(row.effortEstimateHours),
    requiredRoleIds: row.roleRequirements.map((item) => item.roleId),
    requiredSkillIds: row.skillRequirements.map((item) => item.skillId),
  };
}

function sameValue(field: PatchableField, current: unknown, next: unknown) {
  if (field === 'deadlineAt') {
    return new Date(next as string).toISOString() === current;
  }
  if (field === 'requiredRoleIds' || field === 'requiredSkillIds') {
    const a = [...(current as string[])].sort();
    const b = [...(next as string[])].sort();
    return a.length === b.length && a.every((id, index) => id === b[index]);
  }
  return current === next;
}

function pick(
  view: Record<PatchableField, unknown>,
  fields: readonly PatchableField[],
): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field, view[field]]));
}

function auditSnapshot(row: TaskRow): Record<string, unknown> {
  return {
    teamId: row.teamId,
    accountableUserId: row.accountableUserId,
    status: row.status,
    assignmentMode: row.assignmentMode,
    requiredPeople: row.requiredPeople,
    ...patchView(row),
    version: row.version,
  };
}

/**
 * Task theo schema Task của contract. Phần thuộc module chưa triển khai trả đúng hiện trạng, không bịa:
 * chưa có assignment nên không có R, chỗ giữ hay request; chưa có dependency, blocker, RACI contact hay risk snapshot.
 * availableActions chỉ gồm action đã có endpoint.
 */
export function formatTask(row: TaskRow, viewerRole: 'MANAGER' | 'MEMBER') {
  const isManager = viewerRole === 'MANAGER';
  const estimate = toNumber(row.effortEstimateHours);
  const openWorkState = row.openWorkClosedAt
    ? 'CLOSED'
    : row.openWorkOpenedAt
      ? 'OPEN'
      : 'NOT_OPENED';
  return {
    id: row.id,
    teamId: row.teamId,
    teamName: row.team.name,
    milestoneId: row.milestoneId,
    milestoneName: row.milestone?.name ?? null,
    title: row.title,
    description: row.description,
    accountableUserId: row.accountableUserId,
    accountableUser: {
      userId: row.accountableUserId,
      displayName: row.accountableMembership.user.displayName,
    },
    responsibleUserIds: [] as string[],
    responsibleUsers: [] as unknown[],
    consultantUserIds: [] as string[],
    informedUserIds: [] as string[],
    requiredRoleIds: row.roleRequirements.map((item) => item.roleId),
    requiredSkillIds: row.skillRequirements.map((item) => item.skillId),
    predecessors: [] as unknown[],
    successors: [] as unknown[],
    status: row.status,
    assignmentMode: row.assignmentMode,
    openWork: {
      state: openWorkState,
      closedReason: row.openWorkClosedReason,
      acceptedCount: 0,
      occupiedSlots: 0,
      requiredPeople: row.requiredPeople,
      pendingRequestCount: isManager ? 0 : null,
    },
    priority: row.priority,
    deadlineAt: row.deadlineAt.toISOString(),
    deadlineType: row.deadlineType,
    effortEstimateHours: estimate,
    effortActualHours: toNumber(row.effortActualHours),
    unallocatedEffortHours: estimate,
    requiredPeople: row.requiredPeople,
    occupiedSlots: 0,
    progress: row.progress,
    resultText: row.resultText,
    resultUrl: row.resultUrl,
    openBlockerCount: 0,
    openBlockerSince: null,
    affectedTaskCount: 0,
    risk: null,
    availableActions:
      isManager && row.status !== 'DONE'
        ? ['EDIT_TASK', 'UPDATE_REQUIRED_PEOPLE']
        : [],
    myRequestStatus: null,
    version: row.version,
    startedAt: row.startedAt?.toISOString() ?? null,
    currentInProgressSince: row.currentInProgressSince?.toISOString() ?? null,
    lastQualifyingActivityAt:
      row.lastQualifyingActivityAt?.toISOString() ?? null,
    lastQualifyingActivityType: row.lastQualifyingActivityType,
    currentReviewSince: row.currentReviewSince?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
