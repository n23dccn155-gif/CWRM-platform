/** Dữ liệu minh họa cho UI. RiskSnapshot bám bản schema ứng viên CWRM-15; chưa phải API contract đã chốt. */
export type TaskStatus =
  | "To Do"
  | "In Progress"
  | "Blocked"
  | "Review"
  | "Done"
  | "TO_DO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "REVIEW"
  | "DONE";
export type AssignmentStatus =
  | "Pending Acceptance"
  | "Accepted"
  | "Declined"
  | "PENDING_ACCEPTANCE"
  | "ACCEPTED"
  | "DECLINED";
export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Withdrawn"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN";
export type RiskLevel = "Low" | "Medium" | "High" | "LOW" | "MEDIUM" | "HIGH" | "Chưa đánh giá";
export type SnapshotRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type AssignmentMode = "Direct" | "Open Work" | "DIRECT" | "OPEN_WORK";
export type Priority = "Low" | "Medium" | "High" | "Critical" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TaskSummary {
  id: string;
  title: string;
  team: string;
  status: TaskStatus;
  assignmentMode: AssignmentMode;
  assignmentStatus?: AssignmentStatus;
  requestStatus?: RequestStatus;
  accountable: string;
  responsible?: string;
  responsibleUserIds?: string[];
  assignments?: { id: string; userName: string; status: AssignmentStatus; reason?: string }[];
  requests?: { id: string; userName: string; status: RequestStatus; reason?: string }[];
  priority: Priority;
  progress: number;
  deadlineLabel: string;
  riskLevel: RiskLevel;
  openBlockers: number;
  assignee?: string;
  requiredRole?: string;
  requiredSkills?: string[];
  slots?: number;
  requiredPeople?: number;
  reservedPeople?: number;
  predecessorId?: string;
  predecessorIds?: string[];
  description?: string;
  reviewResultText?: string;
  reviewResultUrl?: string;
}

export interface RiskSnapshot {
  taskId: string;
  riskLevel: SnapshotRiskLevel;
  baseLevel: SnapshotRiskLevel;
  evaluatedAt: string;
  ruleVersion: string;
  triggeredRules: string[];
  inputFingerprint: string;
  isCurrent?: boolean;
  evaluationError?: { code?: string; message?: string } | null;
  evidence: {
    id: string;
    source: "task" | "evaluation" | "rule" | "impact";
    ruleId?: string;
    field: string;
    value: string | number | boolean | null;
    unit?: string;
  }[];
}

/** Hồ sơ Member minh họa cho trạng thái eligibility trên Open Work. */
export const demoMemberProfile = {
  name: "Trần An",
  teams: ["Marketing"],
  role: "Graphic Designer",
  skills: ["Figma"],
};

export const demoDirectMemberProfile = {
  name: "Nguyễn Bình",
  teams: ["Marketing"],
  role: "Content Specialist",
  skills: ["Writing"],
};

export function missingOpenWorkRequirements(task: TaskSummary): string[] {
  const missing: string[] = [];
  if (!demoMemberProfile.teams.includes(task.team)) missing.push(`Không thuộc ${task.team}`);
  if (task.requiredRole && task.requiredRole !== demoMemberProfile.role) missing.push(`Cần role ${task.requiredRole}`);
  for (const skill of task.requiredSkills ?? []) {
    if (!demoMemberProfile.skills.includes(skill)) missing.push(`Thiếu skill ${skill}`);
  }
  return missing;
}

export const demoTasks: TaskSummary[] = [
  {
    id: "TASK-101",
    title: "Viết bài truyền thông chiến dịch",
    team: "Marketing",
    status: "To Do",
    assignmentMode: "Direct",
    assignmentStatus: "Pending Acceptance",
    accountable: "Marketing Team Lead",
    responsibleUserIds: [],
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 5 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    assignee: "Nguyễn Bình",
    requiredPeople: 1,
    reservedPeople: 0,
    assignments: [{ id: "as-01", userName: "Nguyễn Bình", status: "Pending Acceptance" }],
    description: "Bài truyền thông cho Campaign Launch; trạng thái minh họa lời mời Direct.",
  },
  {
    id: "TASK-102",
    title: "Thiết kế poster · chờ duyệt request",
    team: "Marketing",
    status: "To Do",
    assignmentMode: "Open Work",
    requestStatus: "Pending",
    responsibleUserIds: [],
    requests: [{ id: "rq-01", userName: "Trần An", status: "Pending" }],
    accountable: "Marketing Team Lead",
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 6 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    requiredRole: "Graphic Designer",
    requiredSkills: ["Figma"],
    slots: 1,
    requiredPeople: 1,
    reservedPeople: 0,
    description: "Trạng thái minh họa trước khi Manager duyệt request poster.",
  },
  {
    id: "TASK-103",
    title: "Thiết kế poster",
    team: "Marketing",
    status: "Blocked",
    assignmentMode: "Open Work",
    assignmentStatus: "Accepted",
    requestStatus: "Approved",
    accountable: "Marketing Team Lead",
    responsible: "Trần An",
    responsibleUserIds: ["member-designer"],
    assignments: [{ id: "as-02", userName: "Trần An", status: "Accepted" }],
    requests: [{ id: "rq-02", userName: "Trần An", status: "Approved" }, { id: "rq-03", userName: "Lê Mai", status: "Pending" }],
    priority: "High",
    progress: 30,
    deadlineLabel: "Còn 40 giờ",
    riskLevel: "High",
    openBlockers: 1,
    requiredRole: "Graphic Designer",
    requiredSkills: ["Figma"],
    slots: 2,
    requiredPeople: 2,
    reservedPeople: 1,
    description: "Poster Campaign Launch; blocker đang mở, risk R03 mức HIGH và task Chạy quảng cáo phụ thuộc poster Done.",
  },
  {
    id: "TASK-104",
    title: "Chuẩn bị trang đích chiến dịch",
    team: "Marketing",
    status: "In Progress",
    assignmentMode: "Direct",
    assignmentStatus: "Accepted",
    accountable: "Marketing Team Lead",
    responsible: "Nguyễn Bình",
    responsibleUserIds: ["member-writer"],
    priority: "Low",
    progress: 65,
    deadlineLabel: "Còn 7 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    assignee: "Nguyễn Bình",
    requiredPeople: 1,
    reservedPeople: 1,
    description: "Chuẩn bị trang đích cho Campaign Launch; Member Nguyễn Bình đang thực hiện (In Progress 65%).",
  },
  {
    id: "TASK-105",
    title: "Viết nội dung chiến dịch",
    team: "Marketing",
    status: "Review",
    assignmentMode: "Direct",
    assignmentStatus: "Accepted",
    accountable: "Marketing Team Lead",
    responsible: "Nguyễn Bình",
    responsibleUserIds: ["member-content"],
    assignments: [{ id: "as-03", userName: "Nguyễn Bình", status: "Accepted" }],
    reviewResultText: "Đã hoàn thành nội dung Campaign Launch và gửi bản bài viết cho A nghiệm thu.",
    priority: "Medium",
    progress: 100,
    deadlineLabel: "Còn 12 giờ",
    riskLevel: "Low",
    openBlockers: 0,
    assignee: "Nguyễn Bình",
    requiredPeople: 1,
    reservedPeople: 1,
    description: "Bài viết đã nộp, đang chờ A xem xét kết quả.",
  },
  {
    id: "TASK-106",
    title: "Chạy quảng cáo",
    team: "Marketing",
    status: "To Do",
    assignmentMode: "Direct",
    assignmentStatus: "Accepted",
    accountable: "Marketing Team Lead",
    responsible: "Lê Mai",
    responsibleUserIds: ["member-dev"],
    assignee: "Lê Mai",
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 8 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    requiredPeople: 1,
    reservedPeople: 1,
    predecessorId: "TASK-103",
    predecessorIds: ["TASK-103"],
    description: "Chỉ được bắt đầu sau khi Thiết kế poster đã được nghiệm thu Done.",
  },
  {
    id: "TASK-107",
    title: "Chuẩn hóa bộ biểu mẫu",
    team: "Nhóm B",
    status: "To Do",
    assignmentMode: "Open Work",
    accountable: "Quản lý nhóm",
    responsibleUserIds: [],
    priority: "Low",
    progress: 0,
    deadlineLabel: "Còn 9 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    requiredRole: "Analyst",
    requiredSkills: ["Documentation"],
    slots: 1,
    requiredPeople: 1,
    reservedPeople: 0,
    description: "Việc mở, nhưng Member minh họa không thuộc team và thiếu role/skill bắt buộc.",
  },
  {
    id: "TASK-108",
    title: "Thiết kế banner phụ",
    team: "Marketing",
    status: "To Do",
    assignmentMode: "Open Work",
    accountable: "Marketing Team Lead",
    responsibleUserIds: [],
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 10 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    requiredRole: "Graphic Designer",
    requiredSkills: ["Figma"],
    slots: 1,
    requiredPeople: 1,
    reservedPeople: 0,
    description: "Việc mở cùng team, Member minh họa Trần An đủ điều kiện role Graphic Designer và skill Figma để gửi request.",
  },
];

// Fixture UI đồng bộ với commit 46db860 của CWRM-15; taskId khớp task demo local.
// Blocker vừa mở làm task Blocked, nhưng chưa kích hoạt rule thời lượng trong POC R01–R03.
export const demoRiskSnapshot: RiskSnapshot = {
  taskId: "TASK-103",
  riskLevel: "HIGH",
  baseLevel: "MEDIUM",
  evaluatedAt: "2026-11-10T03:00:00Z",
  ruleVersion: "candidate-v0.1-r01-r03",
  triggeredRules: ["R03"],
  inputFingerprint: "sha256:0000000000000000000000000000000000000000000000000000000000",
  isCurrent: true,
  evidence: [
    { id: "ev-01", source: "task", ruleId: "R03", field: "deadlineAt", value: "2026-11-11T19:00:00Z" },
    { id: "ev-02", source: "evaluation", ruleId: "R03", field: "remainingHours", value: 40, unit: "hours" },
    { id: "ev-03", source: "task", ruleId: "R03", field: "progress", value: 30, unit: "percent" },
    { id: "ev-04", source: "impact", field: "priority", value: "HIGH" },
    { id: "ev-05", source: "rule", ruleId: "R03", field: "remainingHoursMinExclusive", value: 24, unit: "hours" },
    { id: "ev-06", source: "rule", ruleId: "R03", field: "remainingHoursMaxInclusive", value: 48, unit: "hours" },
    { id: "ev-07", source: "rule", ruleId: "R03", field: "progressMaxExclusive", value: 50, unit: "percent" },
  ],
};
