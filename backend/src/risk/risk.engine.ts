import type {
  RiskEngineInput,
  RiskEngineResult,
  RiskTaskInput,
  RiskLevel,
  RuleId,
  RiskEvidence,
  RiskGap,
  RiskAssignmentInput,
} from './risk.types.js';

const HOUR = 3_600_000;
const LEVELS: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const TASK_STATES = ['TO_DO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export class RiskInputError extends Error {
  readonly code = 'RISK_INPUT_INVALID';
  constructor(readonly field: string) {
    super('Invalid risk input: ' + field);
    this.name = 'RiskInputError';
  }
}

function timestamp(value: string, field: string): number {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value)
  ) {
    throw new RiskInputError(field);
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new RiskInputError(field);
  const normalized = new Date(parsed).toISOString();
  if (
    !Number.isFinite(parsed) ||
    normalized.slice(0, 19) !== value.slice(0, 19)
  ) {
    throw new RiskInputError(field);
  }
  return parsed;
}
function nonnegative(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new RiskInputError(field);
}
function uniqueById<T extends { id: string }>(
  values: T[],
  field: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of values) {
    if (!item.id || result.has(item.id)) throw new RiskInputError(field);
    result.set(item.id, item);
  }
  return result;
}
function highest(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVELS[a] >= LEVELS[b] ? a : b;
}
function gapMessage(reason: RiskGap['reasonCode']): string {
  const messages: Record<RiskGap['reasonCode'], string> = {
    CAPACITY_NOT_DECLARED: 'Chưa khai báo năng lực làm việc.',
    CAPACITY_NOT_APPROVED: 'Năng lực làm việc chưa được phê duyệt.',
    CAPACITY_ZERO: 'Năng lực được phê duyệt bằng 0.',
    REMAINING_EFFORT_MISSING: 'Thiếu dữ liệu effort còn lại.',
  };
  return messages[reason];
}

/** No I/O, ambient clock or mutation. Results are returned only for tasks not DONE. */
export function evaluateRisk(input: RiskEngineInput): RiskEngineResult[] {
  const now = timestamp(input.evaluatedAt, 'evaluatedAt');
  if (!input.workspaceId) throw new RiskInputError('workspaceId');
  const tasks = uniqueById(input.tasks, 'tasks.id');
  const milestones = uniqueById(input.milestones, 'milestones.id');
  const assignmentIds = new Map<string, RiskAssignmentInput>();
  const activePairs = new Set<string>();
  const active: RiskAssignmentInput[] = [];
  const capacities = new Map<string, RiskEngineInput['capacities'][number]>();

  for (const task of tasks.values()) {
    if (
      task.workspaceId !== input.workspaceId ||
      !TASK_STATES.includes(task.status)
    )
      throw new RiskInputError('task.workspace/status');
    timestamp(task.deadlineAt, 'task.deadlineAt');
    if (
      !Number.isInteger(task.progress) ||
      task.progress < 0 ||
      task.progress > 100
    )
      throw new RiskInputError('task.progress');
    if (
      !PRIORITIES.includes(task.priority) ||
      !['FIXED', 'FLEXIBLE'].includes(task.deadlineType)
    )
      throw new RiskInputError('task.priority/deadlineType');
    nonnegative(task.requiredPeople, 'task.requiredPeople');
    nonnegative(task.affectedTaskCount, 'task.affectedTaskCount');
    if (
      !Number.isInteger(task.requiredPeople) ||
      task.requiredPeople < 1 ||
      !Number.isInteger(task.affectedTaskCount)
    )
      throw new RiskInputError('task.people/impact');
    if (task.milestoneId !== null && !milestones.has(task.milestoneId))
      throw new RiskInputError('task.milestoneId');
    for (const predecessor of task.predecessorIds) {
      if (predecessor === task.id || !tasks.has(predecessor))
        throw new RiskInputError('task.predecessorIds');
    }
    for (const field of [
      'currentInProgressSince',
      'lastQualifyingActivityAt',
      'currentReviewSince',
      'openBlockerSince',
    ] as const) {
      const value = task[field];
      if (value !== null && timestamp(value, field) > now)
        throw new RiskInputError(field);
    }
    if (task.status === 'IN_PROGRESS' && task.currentInProgressSince === null)
      throw new RiskInputError('currentInProgressSince');
    if (task.status === 'REVIEW' && task.currentReviewSince === null)
      throw new RiskInputError('currentReviewSince');
  }
  for (const milestone of milestones.values()) {
    if (milestone.workspaceId !== input.workspaceId)
      throw new RiskInputError('milestone.workspaceId');
    timestamp(milestone.deadlineAt, 'milestone.deadlineAt');
    for (const id of milestone.taskIds) {
      if (tasks.get(id)?.milestoneId !== milestone.id)
        throw new RiskInputError('milestone.taskIds');
    }
  }
  for (const task of tasks.values()) {
    if (
      task.milestoneId !== null &&
      !milestones.get(task.milestoneId)?.taskIds.includes(task.id)
    )
      throw new RiskInputError('milestone.taskIds');
  }
  for (const capacity of input.capacities) {
    if (
      !capacity.userId ||
      capacities.has(capacity.userId) ||
      !['NOT_DECLARED', 'PENDING_APPROVAL', 'APPROVED'].includes(
        capacity.status,
      )
    )
      throw new RiskInputError('capacities');
    if (capacity.approvedWeeklyHours !== null)
      nonnegative(capacity.approvedWeeklyHours, 'capacity.approvedWeeklyHours');
    capacities.set(capacity.userId, capacity);
  }
  for (const assignment of input.assignments) {
    if (!assignment.id || !assignment.userId || !tasks.has(assignment.taskId))
      throw new RiskInputError('assignment.identity');
    const seen = assignmentIds.get(assignment.id);
    if (seen) {
      if (JSON.stringify(seen) !== JSON.stringify(assignment))
        throw new RiskInputError('assignment.duplicate');
      continue; // A repeated join row must not double the workload.
    }
    assignmentIds.set(assignment.id, assignment);
    if (
      !['PENDING_ACCEPTANCE', 'ACCEPTED', 'DECLINED'].includes(
        assignment.status,
      )
    )
      throw new RiskInputError('assignment.status');
    if (assignment.endedAt !== null)
      timestamp(assignment.endedAt, 'assignment.endedAt');
    if (assignment.remainingEffortHours !== null)
      nonnegative(
        assignment.remainingEffortHours,
        'assignment.remainingEffortHours',
      );
    if (assignment.status !== 'ACCEPTED' || assignment.endedAt !== null)
      continue;
    const pair = assignment.taskId + ':' + assignment.userId;
    if (activePairs.has(pair))
      throw new RiskInputError('assignment.activePair');
    activePairs.add(pair);
    active.push(assignment);
  }

  // Stable ordering gives repeatable evidence IDs even when DB rows arrive in a different order.
  const orderedTasks = [...tasks.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const results = new Map<string, RiskEngineResult>();
  function evidence(
    result: RiskEngineResult,
    ruleId: RuleId,
    field: string,
    value: RiskEvidence['value'],
    source: RiskEvidence['source'] = 'evaluation',
    groupId?: string,
  ): void {
    result.evidence.push({
      id: 'ev-' + (result.evidence.length + 1),
      source,
      ruleId,
      field,
      value,
      ...(groupId ? { groupId } : {}),
    });
  }
  function trigger(
    task: RiskTaskInput,
    result: RiskEngineResult,
    ruleId: RuleId,
    level: RiskLevel,
    fields: Record<string, RiskEvidence['value']>,
  ): void {
    if (!result.triggeredRules.includes(ruleId))
      result.triggeredRules.push(ruleId);
    result.baseLevel = highest(result.baseLevel, level);
    let final = level;
    if (level === 'MEDIUM' && ruleId !== 'R09' && ruleId !== 'R13') {
      evidence(result, ruleId, 'priority', task.priority, 'impact');
      evidence(result, ruleId, 'deadlineType', task.deadlineType, 'impact');
      evidence(
        result,
        ruleId,
        'affectedTaskCount',
        task.affectedTaskCount,
        'impact',
      );
      if (
        ['HIGH', 'CRITICAL'].includes(task.priority) ||
        task.deadlineType === 'FIXED' ||
        task.affectedTaskCount >= 3
      )
        final = 'HIGH';
    }
    result.riskLevel = highest(result.riskLevel, final);
    for (const [field, value] of Object.entries(fields))
      evidence(result, ruleId, field, value);
  }
  for (const task of orderedTasks) {
    if (task.status === 'DONE') continue;
    const result: RiskEngineResult = {
      taskId: task.id,
      ruleVersion: '2.0.0',
      evaluatedAt: input.evaluatedAt,
      riskLevel: 'LOW',
      baseLevel: 'LOW',
      triggeredRules: [],
      evaluationCoverage: 'COMPLETE',
      notEvaluated: [],
      evidence: [],
    };
    results.set(task.id, result);
    const remainingHours =
      (timestamp(task.deadlineAt, 'deadlineAt') - now) / HOUR;
    const near = remainingHours >= 0 && remainingHours <= 48;
    if (remainingHours < 0)
      trigger(task, result, 'R01', 'HIGH', {
        remainingHours,
        deadlineAt: task.deadlineAt,
      });
    if (remainingHours >= 0 && remainingHours <= 24 && task.progress < 80)
      trigger(task, result, 'R02', 'HIGH', {
        remainingHours,
        progress: task.progress,
      });
    if (remainingHours > 24 && remainingHours <= 48 && task.progress < 50)
      trigger(task, result, 'R03', 'MEDIUM', {
        remainingHours,
        progress: task.progress,
      });
    if (task.openBlockerSince !== null) {
      const blockerHours =
        (now - timestamp(task.openBlockerSince, 'openBlockerSince')) / HOUR;
      if (blockerHours >= 48)
        trigger(task, result, 'R04', 'HIGH', {
          blockerHours,
          openBlockerSince: task.openBlockerSince,
        });
      else if (blockerHours >= 24)
        trigger(task, result, 'R05', 'MEDIUM', {
          blockerHours,
          openBlockerSince: task.openBlockerSince,
        });
    }
    const predecessors = task.predecessorIds
      .map((id) => tasks.get(id)!)
      .filter((p) => p.status !== 'DONE');
    if (task.status === 'TO_DO' && near && predecessors.length > 0) {
      const urgent = predecessors.some(
        (p) =>
          p.status === 'BLOCKED' ||
          timestamp(p.deadlineAt, 'predecessor.deadlineAt') < now,
      );
      trigger(
        task,
        result,
        urgent ? 'R06' : 'R07',
        urgent ? 'HIGH' : 'MEDIUM',
        { remainingHours, incompletePredecessorCount: predecessors.length },
      );
    }
    const responsibleCount = active.filter((a) => a.taskId === task.id).length;
    if (
      ['TO_DO', 'IN_PROGRESS'].includes(task.status) &&
      near &&
      responsibleCount < task.requiredPeople
    ) {
      trigger(task, result, 'R08', 'MEDIUM', {
        remainingHours,
        activeResponsibleCount: responsibleCount,
        requiredPeople: task.requiredPeople,
      });
    }
    if (task.status === 'REVIEW') {
      const reviewHours =
        (now - timestamp(task.currentReviewSince!, 'currentReviewSince')) /
        HOUR;
      if ((remainingHours >= 0 && remainingHours <= 24) || reviewHours >= 48)
        trigger(task, result, 'R10', 'MEDIUM', {
          remainingHours,
          reviewHours,
          currentReviewSince: task.currentReviewSince,
        });
    }
    const milestone =
      task.milestoneId === null ? undefined : milestones.get(task.milestoneId);
    if (
      milestone &&
      milestone.taskIds.some((id) => tasks.get(id)!.status !== 'DONE')
    ) {
      const milestoneRemainingHours =
        (timestamp(milestone.deadlineAt, 'milestone.deadlineAt') - now) / HOUR;
      if (milestoneRemainingHours < 0)
        trigger(task, result, 'R11', 'HIGH', {
          milestoneId: milestone.id,
          milestoneRemainingHours,
        });
      else if (milestoneRemainingHours <= 48)
        trigger(task, result, 'R12', 'MEDIUM', {
          milestoneId: milestone.id,
          milestoneRemainingHours,
        });
    }
    if (task.status === 'IN_PROGRESS') {
      const episode = timestamp(
        task.currentInProgressSince!,
        'currentInProgressSince',
      );
      const last =
        task.lastQualifyingActivityAt === null
          ? episode
          : Math.max(
              episode,
              timestamp(
                task.lastQualifyingActivityAt,
                'lastQualifyingActivityAt',
              ),
            );
      const elapsedHours = (now - last) / HOUR;
      if (elapsedHours >= 72) {
        trigger(task, result, 'R13', 'MEDIUM', {
          currentInProgressSince: task.currentInProgressSince,
          lastQualifyingActivityAt: task.lastQualifyingActivityAt,
          elapsedHours,
          thresholdHours: 72,
          reason: 'NO_QUALIFYING_ACTIVITY',
        });
      }
    }
  }

  const users = [...new Set(active.map((a) => a.userId))].sort();
  let groupIndex = 0;
  for (const userId of users) {
    const eligible = active.filter((a) => {
      const task = tasks.get(a.taskId)!;
      return (
        a.userId === userId &&
        ['TO_DO', 'IN_PROGRESS', 'BLOCKED'].includes(task.status) &&
        timestamp(task.deadlineAt, 'deadlineAt') > now
      );
    });
    const horizons = [
      ...new Set(
        eligible.map((a) =>
          timestamp(tasks.get(a.taskId)!.deadlineAt, 'deadlineAt'),
        ),
      ),
    ]
      .sort((a, b) => a - b)
      .map((t) => new Date(t).toISOString());
    for (const horizonAt of horizons) {
      const horizon = timestamp(horizonAt, 'horizonAt');
      const cumulative = eligible
        .filter(
          (a) =>
            timestamp(tasks.get(a.taskId)!.deadlineAt, 'deadlineAt') <= horizon,
        )
        .sort((a, b) => a.taskId.localeCompare(b.taskId));
      const capacity = capacities.get(userId);
      const reasons: RiskGap['reasonCode'][] = [];
      if (!capacity || capacity.status === 'NOT_DECLARED')
        reasons.push('CAPACITY_NOT_DECLARED');
      else if (capacity.approvedWeeklyHours === null)
        reasons.push(
          capacity.status === 'PENDING_APPROVAL'
            ? 'CAPACITY_NOT_APPROVED'
            : 'CAPACITY_NOT_DECLARED',
        );
      else if (capacity.approvedWeeklyHours === 0)
        reasons.push('CAPACITY_ZERO');
      if (cumulative.some((a) => a.remainingEffortHours === null))
        reasons.push('REMAINING_EFFORT_MISSING');
      if (reasons.length > 0) {
        for (const assignment of cumulative) {
          const result = results.get(assignment.taskId)!;
          result.evaluationCoverage = 'PARTIAL';
          for (const reasonCode of reasons)
            result.notEvaluated.push({
              ruleId: 'R09',
              horizonAt,
              subjectUserId: userId,
              reasonCode,
              message: gapMessage(reasonCode),
            });
        }
        continue;
      }
      const remaining = cumulative.reduce(
        (sum, a) => sum + a.remainingEffortHours!,
        0,
      );
      const remainingContinuousHoursToDeadline = (horizon - now) / HOUR;
      const availableHours =
        (capacity!.approvedWeeklyHours! * remainingContinuousHoursToDeadline) /
        168;
      if (
        !Number.isFinite(availableHours) ||
        availableHours <= 0 ||
        !Number.isFinite(remaining)
      )
        throw new RiskInputError('R09.numericRange');
      const ratio = (remaining / availableHours) * 100;
      if (!Number.isFinite(ratio)) throw new RiskInputError('R09.numericRange');
      const level: RiskLevel =
        remaining > availableHours * 1.25 ? 'HIGH' : 'MEDIUM';
      const groupId = 'group-' + ++groupIndex;
      for (const assignment of cumulative) {
        const result = results.get(assignment.taskId)!;
        for (const [field, value] of Object.entries({
          subjectUserId: userId,
          horizonAt,
          approvedWeeklyHours: capacity!.approvedWeeklyHours,
          remainingContinuousHoursToDeadline,
          availableHours,
          cumulativeRemainingHours: remaining,
          workloadRatioPercent: ratio,
          mediumThresholdPercent: 100,
          highThresholdPercent: 125,
        }))
          evidence(result, 'R09', field, value, 'evaluation', groupId);
        if (
          remaining <= availableHours ||
          assignment.remainingEffortHours === 0
        )
          continue;
        const task = tasks.get(assignment.taskId)!;
        trigger(task, result, 'R09', level, {});
      }
    }
  }
  for (const result of results.values()) result.triggeredRules.sort();
  return [...results.values()];
}
