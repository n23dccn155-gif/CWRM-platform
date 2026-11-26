import { describe, expect, it } from 'vitest';
import { evaluateRisk, RiskInputError } from './risk.engine.js';
import type { RiskEngineInput, RiskTaskInput } from './risk.types.js';

const T = '2026-11-24T00:00:00.000Z';
const time = (hours: number) =>
  new Date(Date.parse(T) + hours * 3_600_000).toISOString();
function task(overrides: Partial<RiskTaskInput> = {}): RiskTaskInput {
  return {
    id: 'a',
    workspaceId: 'ws',
    status: 'TO_DO',
    deadlineAt: time(200),
    progress: 100,
    priority: 'LOW',
    deadlineType: 'FLEXIBLE',
    requiredPeople: 1,
    affectedTaskCount: 0,
    predecessorIds: [],
    milestoneId: null,
    currentInProgressSince: null,
    lastQualifyingActivityAt: null,
    currentReviewSince: null,
    openBlockerSince: null,
    ...overrides,
  };
}
function input(tasks: RiskTaskInput[] = [task()]): RiskEngineInput {
  return {
    workspaceId: 'ws',
    evaluatedAt: T,
    tasks,
    assignments: [],
    capacities: [],
    milestones: [],
  };
}
function rules(t: RiskTaskInput) {
  return evaluateRisk(input([t]))[0]!.triggeredRules;
}

describe('Risk rule semantics from Scope Final / OpenAPI 0.3.3', () => {
  it.each([
    ['R01', task({ deadlineAt: time(-1) })],
    ['R02', task({ deadlineAt: time(24), progress: 79 })],
    ['R03', task({ deadlineAt: time(48), progress: 49 })],
    ['R04', task({ openBlockerSince: time(-48) })],
    ['R05', task({ openBlockerSince: time(-24) })],
    ['R08', task({ deadlineAt: time(48) })],
    ['R10', task({ status: 'REVIEW', currentReviewSince: time(-48) })],
    ['R13', task({ status: 'IN_PROGRESS', currentInProgressSince: time(-72) })],
  ])('%s activates on its boundary', (id, t) => {
    expect(rules(t as RiskTaskInput)).toContain(id);
  });

  it('R02/R03 use exact time and progress limits', () => {
    expect(rules(task({ deadlineAt: time(24), progress: 80 }))).not.toContain(
      'R02',
    );
    expect(
      rules(task({ deadlineAt: time(24 + 1 / 3600), progress: 49 })),
    ).toContain('R03');
    expect(
      rules(task({ deadlineAt: time(48 + 1 / 3600), progress: 49 })),
    ).not.toContain('R03');
    expect(rules(task({ deadlineAt: time(48), progress: 50 }))).not.toContain(
      'R03',
    );
    expect(rules(task({ deadlineAt: time(0), progress: 80 }))).not.toContain(
      'R01',
    );
  });

  it('R06 replaces R07 for an incomplete blocked or overdue predecessor', () => {
    const child = task({
      id: 'b',
      deadlineAt: time(48),
      predecessorIds: ['a'],
    });
    expect(evaluateRisk(input([task(), child]))[1]!.triggeredRules).toContain(
      'R07',
    );
    const high = evaluateRisk(input([task({ status: 'BLOCKED' }), child]))[1]!;
    expect(high.triggeredRules).toContain('R06');
    expect(high.triggeredRules).not.toContain('R07');
    expect(
      evaluateRisk(input([task({ status: 'DONE' }), child]))[0]!.triggeredRules,
    ).not.toContain('R07');
    expect(
      evaluateRisk(input([task({ deadlineAt: time(-1) }), child]))[1]!
        .triggeredRules,
    ).toContain('R06');
  });

  it('pending and ended assignments do not count as R; BLOCKED does not trigger R08', () => {
    const data = input([task({ deadlineAt: time(24) })]);
    data.assignments = [
      {
        id: 'r1',
        taskId: 'a',
        userId: 'u1',
        status: 'PENDING_ACCEPTANCE',
        endedAt: null,
        remainingEffortHours: 0,
      },
      {
        id: 'r2',
        taskId: 'a',
        userId: 'u2',
        status: 'ACCEPTED',
        endedAt: time(-1),
        remainingEffortHours: 0,
      },
    ];
    expect(evaluateRisk(data)[0]!.triggeredRules).toContain('R08');
    data.assignments[0]!.status = 'ACCEPTED';
    expect(evaluateRisk(data)[0]!.triggeredRules).not.toContain('R08');
    expect(
      rules(task({ status: 'BLOCKED', deadlineAt: time(24) })),
    ).not.toContain('R08');
  });

  it('R11/R12 follow incomplete milestone work and skip DONE tasks', () => {
    const data = input([task({ milestoneId: 'm' })]);
    data.milestones = [
      { id: 'm', workspaceId: 'ws', deadlineAt: time(-1), taskIds: ['a'] },
    ];
    expect(evaluateRisk(data)[0]!.triggeredRules).toContain('R11');
    data.milestones[0]!.deadlineAt = time(48);
    expect(evaluateRisk(data)[0]!.triggeredRules).toContain('R12');
    data.tasks[0]!.status = 'DONE';
    expect(evaluateRisk(data)).toEqual([]);
    expect(evaluateRisk(input())).toHaveLength(1);
  });

  it('boost applies once to MEDIUM except R09/R13', () => {
    const boosted = evaluateRisk(
      input([task({ deadlineAt: time(48), progress: 49, priority: 'HIGH' })]),
    )[0]!;
    expect(boosted.baseLevel).toBe('MEDIUM');
    expect(boosted.riskLevel).toBe('HIGH');
    const idle = evaluateRisk(
      input([
        task({
          status: 'IN_PROGRESS',
          currentInProgressSince: time(-72),
          priority: 'CRITICAL',
          deadlineType: 'FIXED',
          affectedTaskCount: 3,
        }),
      ]),
    )[0]!;
    expect(idle.triggeredRules).toEqual(['R13']);
    expect(idle.riskLevel).toBe('MEDIUM');
  });

  it('R13 handles a committed qualifying activity, new episode and exact 72h', () => {
    const idle = task({
      status: 'IN_PROGRESS',
      currentInProgressSince: time(-72 + 1 / 3600),
    });
    expect(rules(idle)).not.toContain('R13');
    idle.currentInProgressSince = time(-72);
    expect(rules(idle)).toContain('R13');
    idle.lastQualifyingActivityAt = time(-1);
    expect(rules(idle)).not.toContain('R13');
    idle.lastQualifyingActivityAt = time(-200);
    idle.currentInProgressSince = time(-2);
    expect(rules(idle)).not.toContain('R13');
    idle.status = 'BLOCKED';
    expect(rules(idle)).not.toContain('R13');
  });

  it('R04/R05 use continuous interval and stop when it is cleared', () => {
    const t = task({
      status: 'IN_PROGRESS',
      currentInProgressSince: time(-60),
      openBlockerSince: time(-48 + 1 / 3600),
    });
    expect(rules(t)).toContain('R05');
    expect(rules(t)).not.toContain('R04');
    t.openBlockerSince = time(-48);
    expect(rules(t)).toContain('R04');
    expect(rules(t)).not.toContain('R05');
    t.openBlockerSince = null;
    expect(rules(t)).not.toContain('R04');
  });

  it('required invalid inputs fail instead of yielding LOW', () => {
    for (const t of [
      task({ progress: NaN }),
      task({ progress: 1.2 }),
      task({ deadlineAt: '2026-02-30T00:00:00Z' }),
      task({ deadlineAt: 'invalid' }),
      task({ status: 'IN_PROGRESS' }),
      task({ status: 'REVIEW' }),
    ])
      expect(() => evaluateRisk(input([t]))).toThrow(RiskInputError);
  });
});

describe('R09 cumulative horizons', () => {
  function workload(): RiskEngineInput {
    const data = input([
      task({ deadlineAt: time(24) }),
      task({ id: 'b', deadlineAt: time(48) }),
    ]);
    data.assignments = [
      {
        id: 'r1',
        taskId: 'a',
        userId: 'u',
        status: 'ACCEPTED',
        endedAt: null,
        remainingEffortHours: 4,
      },
      {
        id: 'r2',
        taskId: 'b',
        userId: 'u',
        status: 'ACCEPTED',
        endedAt: null,
        remainingEffortHours: 2,
      },
    ];
    data.capacities = [
      { userId: 'u', status: 'APPROVED', approvedWeeklyHours: 21 },
    ];
    return data;
  }
  it('later 100% does not clear the earlier 133.33% overload or spread it to B', () => {
    const [a, b] = evaluateRisk(workload());
    expect(a!.triggeredRules).toContain('R09');
    expect(a!.riskLevel).toBe('HIGH');
    expect(b!.triggeredRules).not.toContain('R09');
    expect(a!.evidence.filter((e) => e.field === 'horizonAt')).toHaveLength(2);
  });
  it.each([
    [6, null],
    [7.5, 'MEDIUM'],
    [7.51, 'HIGH'],
  ] as const)('same deadline total %s respects 100/125%%', (total, level) => {
    const data = workload();
    data.tasks[0]!.deadlineAt = time(48);
    data.assignments[0]!.remainingEffortHours = total - 2;
    data.tasks.forEach((t) => {
      t.priority = 'CRITICAL';
      t.deadlineType = 'FIXED';
    });
    const a = evaluateRisk(data)[0]!;
    expect(a.triggeredRules.includes('R09')).toBe(level !== null);
    if (level !== null) expect(a.riskLevel).toBe(level);
  });
  it('missing remaining creates Partial while 0 is evaluated and never receives overload', () => {
    const data = workload();
    data.assignments[0]!.remainingEffortHours = 0;
    data.assignments[1]!.remainingEffortHours = null;
    let [a, b] = evaluateRisk(data);
    expect(a!.triggeredRules).not.toContain('R09');
    expect(a!.evaluationCoverage).toBe('PARTIAL');
    expect(b!.notEvaluated[0]!.reasonCode).toBe('REMAINING_EFFORT_MISSING');
    expect(
      a!.evidence.some((e) => e.field === 'horizonAt' && e.value === time(24)),
    ).toBe(true);
    data.assignments[1]!.remainingEffortHours = 0;
    [a, b] = evaluateRisk(data);
    expect(a!.evaluationCoverage).toBe('COMPLETE');
    expect(b!.evaluationCoverage).toBe('COMPLETE');
  });
  it.each(['missing', 'pending', 'zero'] as const)(
    '%s capacity yields a gap without division by zero',
    (kind) => {
      const data = workload();
      if (kind === 'missing') data.capacities = [];
      if (kind === 'pending') {
        data.capacities[0]!.status = 'PENDING_APPROVAL';
        data.capacities[0]!.approvedWeeklyHours = null;
      }
      if (kind === 'zero') data.capacities[0]!.approvedWeeklyHours = 0;
      const result = evaluateRisk(data)[0]!;
      expect(result.evaluationCoverage).toBe('PARTIAL');
      expect(result.triggeredRules).not.toContain('R09');
      expect(result.notEvaluated[0]!.reasonCode).toBe(
        {
          missing: 'CAPACITY_NOT_DECLARED',
          pending: 'CAPACITY_NOT_APPROVED',
          zero: 'CAPACITY_ZERO',
        }[kind],
      );
    },
  );
  it('deduplicates repeated join rows, merges equal instants and preserves caller data', () => {
    const data = workload();
    data.tasks[0]!.deadlineAt = '2026-11-26T00:00:00Z';
    data.assignments.push({ ...data.assignments[0]! });
    const original = structuredClone(data);
    const expected = evaluateRisk(data);
    expect(
      expected[0]!.evidence.filter((e) => e.field === 'horizonAt'),
    ).toHaveLength(1);
    expect(data).toEqual(original);
    data.tasks.reverse();
    data.assignments.reverse();
    expect(evaluateRisk(data)).toEqual(expected);
  });
  it('same user/task duplicated under a different assignment fails, cross-workspace fails', () => {
    const data = workload();
    data.assignments.push({ ...data.assignments[0]!, id: 'r3' });
    expect(() => evaluateRisk(data)).toThrow(RiskInputError);
    data.assignments.pop();
    data.tasks[0]!.workspaceId = 'other';
    expect(() => evaluateRisk(data)).toThrow(RiskInputError);
  });
  it('pending approval with no approved value keeps the approval reason', () => {
    const data = workload();
    data.capacities[0]!.status = 'PENDING_APPROVAL';
    data.capacities[0]!.approvedWeeklyHours = null;
    expect(evaluateRisk(data)[0]!.notEvaluated[0]!.reasonCode).toBe(
      'CAPACITY_NOT_APPROVED',
    );
  });
  it('retains the highest overload from multiple active responsible users', () => {
    const data = workload();
    data.assignments.push({
      id: 'r3',
      taskId: 'a',
      userId: 'u2',
      status: 'ACCEPTED',
      endedAt: null,
      remainingEffortHours: 1,
    });
    data.capacities.push({
      userId: 'u2',
      status: 'APPROVED',
      approvedWeeklyHours: 21,
    });
    const result = evaluateRisk(data)[0]!;
    expect(result.riskLevel).toBe('HIGH');
    expect(result.triggeredRules.filter((id) => id === 'R09')).toHaveLength(1);
    expect(
      new Set(
        result.evidence
          .filter((e) => e.field === 'subjectUserId')
          .map((e) => e.value),
      ),
    ).toEqual(new Set(['u', 'u2']));
  });
  it('excludes Review, Done, expired, pending and ended work', () => {
    const data = workload();
    data.tasks[1]!.status = 'REVIEW';
    data.tasks[1]!.currentReviewSince = T;
    data.assignments[1]!.remainingEffortHours = 1000;
    expect(
      evaluateRisk(data)[0]!.evidence.filter((e) => e.field === 'horizonAt'),
    ).toHaveLength(1);
    data.tasks[1]!.status = 'BLOCKED';
    data.tasks[1]!.deadlineAt = time(-1);
    expect(
      evaluateRisk(data)[0]!.evidence.filter((e) => e.field === 'horizonAt'),
    ).toHaveLength(1);
  });
});
