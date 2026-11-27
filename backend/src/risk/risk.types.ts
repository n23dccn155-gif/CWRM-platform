export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskState = 'TO_DO' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'DONE';
export type RuleId =
  | 'R01'
  | 'R02'
  | 'R03'
  | 'R04'
  | 'R05'
  | 'R06'
  | 'R07'
  | 'R08'
  | 'R09'
  | 'R10'
  | 'R11'
  | 'R12'
  | 'R13';

/** Server-side input port. The backend adapter supplies committed state and UTC timestamps. */
export interface RiskTaskInput {
  id: string;
  workspaceId: string;
  status: TaskState;
  deadlineAt: string;
  progress: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deadlineType: 'FIXED' | 'FLEXIBLE';
  requiredPeople: number;
  affectedTaskCount: number;
  predecessorIds: string[];
  milestoneId: string | null;
  currentInProgressSince: string | null;
  lastQualifyingActivityAt: string | null;
  currentReviewSince: string | null;
  /** Start of the current uninterrupted union of OPEN blocker intervals, from committed history. */
  openBlockerSince: string | null;
}
export interface RiskAssignmentInput {
  id: string;
  taskId: string;
  userId: string;
  status: 'PENDING_ACCEPTANCE' | 'ACCEPTED' | 'DECLINED';
  endedAt: string | null;
  remainingEffortHours: number | null;
}
export interface RiskCapacityInput {
  userId: string;
  status: 'NOT_DECLARED' | 'PENDING_APPROVAL' | 'APPROVED';
  approvedWeeklyHours: number | null;
}
export interface RiskMilestoneInput {
  id: string;
  workspaceId: string;
  deadlineAt: string;
  taskIds: string[];
}
export interface RiskEngineInput {
  workspaceId: string;
  evaluatedAt: string;
  tasks: RiskTaskInput[];
  assignments: RiskAssignmentInput[];
  capacities: RiskCapacityInput[];
  milestones: RiskMilestoneInput[];
}
export interface RiskEvidence {
  id: string;
  source: 'task' | 'evaluation' | 'rule' | 'impact';
  ruleId: RuleId;
  field: string;
  value: string | number | boolean | null;
  unit?: string;
  groupId?: string;
}
export interface RiskGap {
  ruleId: 'R09';
  horizonAt: string;
  subjectUserId: string;
  reasonCode:
    | 'CAPACITY_NOT_DECLARED'
    | 'CAPACITY_NOT_APPROVED'
    | 'CAPACITY_ZERO'
    | 'REMAINING_EFFORT_MISSING';
  message: string;
}
/** The persistence adapter adds snapshot ID, fingerprint and triggerSource after success. */
export interface RiskEngineResult {
  taskId: string;
  ruleVersion: '2.0.0';
  evaluatedAt: string;
  riskLevel: RiskLevel;
  baseLevel: RiskLevel;
  triggeredRules: RuleId[];
  evaluationCoverage: 'COMPLETE' | 'PARTIAL';
  notEvaluated: RiskGap[];
  evidence: RiskEvidence[];
}
