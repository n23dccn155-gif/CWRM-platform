/** Dữ liệu minh họa cho UI. RiskSnapshot bám bản schema ứng viên CWRM-15; chưa phải API contract đã chốt. */
export type TaskStatus = "To Do" | "In Progress" | "Blocked" | "Review" | "Done";
export type AssignmentStatus = "Pending Acceptance" | "Accepted" | "Declined";
export type RequestStatus = "Pending" | "Approved" | "Rejected" | "Withdrawn";
export type RiskLevel = "Low" | "Medium" | "High";
export type AssignmentMode = "Direct" | "Open Work";
export type Priority = "Low" | "Medium" | "High" | "Critical";

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
  priority: Priority;
  progress: number;
  deadlineLabel: string;
  riskLevel: RiskLevel;
  openBlockers: number;
  assignee?: string;
  requiredRole?: string;
  requiredSkills?: string[];
  slots?: number;
  predecessorId?: string;
  description?: string;
}

export interface RiskSnapshot {
  taskId: string;
  riskLevel: RiskLevel;
  baseLevel: RiskLevel;
  evaluatedAt: string;
  ruleVersion: string;
  triggeredRules: ("R01" | "R02" | "R03")[];
  inputFingerprint: string;
  evidence: {
    id: string;
    source: "task" | "evaluation" | "rule" | "impact";
    ruleId?: "R01" | "R02" | "R03";
    field: string;
    value: string | number | boolean | null;
    unit?: string;
  }[];
}

/** Hồ sơ Member minh họa cho trạng thái eligibility trên Open Work. */
export const demoMemberProfile = {
  name: "Thành viên nội dung",
  teams: ["Nhóm A"],
  role: "Designer",
  skills: ["Figma"],
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
    title: "Chuẩn bị tài liệu hướng dẫn",
    team: "Nhóm A",
    status: "To Do",
    assignmentMode: "Direct",
    assignmentStatus: "Pending Acceptance",
    accountable: "Quản lý nhóm",
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 5 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    assignee: "Thành viên nội dung",
    description: "Chuẩn bị bản hướng dẫn để nhóm có thể triển khai đồng nhất.",
  },
  {
    id: "TASK-102",
    title: "Thiết kế màn hình tổng quan",
    team: "Nhóm A",
    status: "To Do",
    assignmentMode: "Open Work",
    requestStatus: "Pending",
    accountable: "Quản lý nhóm",
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 6 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    requiredRole: "Designer",
    requiredSkills: ["Figma"],
    slots: 1,
    description: "Thiết kế màn hình tổng quan theo yêu cầu của nhóm.",
  },
  {
    id: "TASK-103",
    title: "Hoàn thiện bản thiết kế",
    team: "Nhóm B",
    status: "Blocked",
    assignmentMode: "Open Work",
    assignmentStatus: "Accepted",
    requestStatus: "Approved",
    accountable: "Quản lý nhóm",
    responsible: "Thành viên thiết kế",
    priority: "High",
    progress: 30,
    deadlineLabel: "Còn 40 giờ",
    riskLevel: "High",
    openBlockers: 1,
    requiredRole: "Designer",
    requiredSkills: ["Figma"],
    slots: 1,
    description: "Hoàn thiện thiết kế và bàn giao cho bước triển khai tiếp theo.",
  },
  {
    id: "TASK-104",
    title: "Kiểm tra nội dung bàn giao",
    team: "Nhóm B",
    status: "In Progress",
    assignmentMode: "Direct",
    assignmentStatus: "Accepted",
    accountable: "Quản lý nhóm",
    responsible: "Thành viên kiểm thử",
    priority: "Low",
    progress: 65,
    deadlineLabel: "Còn 7 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    assignee: "Thành viên kiểm thử",
    description: "Rà soát nội dung bàn giao trước khi nghiệm thu.",
  },
  {
    id: "TASK-105",
    title: "Gửi kết quả để nghiệm thu",
    team: "Nhóm A",
    status: "Review",
    assignmentMode: "Direct",
    assignmentStatus: "Accepted",
    accountable: "Quản lý nhóm",
    responsible: "Thành viên nội dung",
    priority: "Medium",
    progress: 100,
    deadlineLabel: "Còn 12 giờ",
    riskLevel: "Low",
    openBlockers: 0,
    assignee: "Thành viên nội dung",
    description: "Bản bàn giao đã nộp, đang chờ A xem xét kết quả.",
  },
  {
    id: "TASK-106",
    title: "Triển khai sau khi thiết kế hoàn tất",
    team: "Nhóm B",
    status: "To Do",
    assignmentMode: "Direct",
    assignmentStatus: "Accepted",
    accountable: "Quản lý nhóm",
    responsible: "Thành viên triển khai",
    assignee: "Thành viên triển khai",
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 8 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    predecessorId: "TASK-103",
    description: "Chỉ được bắt đầu sau khi TASK-103 đã được nghiệm thu Done.",
  },
  {
    id: "TASK-107",
    title: "Chuẩn hóa bộ biểu mẫu",
    team: "Nhóm B",
    status: "To Do",
    assignmentMode: "Open Work",
    accountable: "Quản lý nhóm",
    priority: "Low",
    progress: 0,
    deadlineLabel: "Còn 9 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    requiredRole: "Analyst",
    requiredSkills: ["Documentation"],
    slots: 1,
    description: "Việc mở, nhưng Member minh họa không thuộc team và thiếu role/skill bắt buộc.",
  },
  {
    id: "TASK-108",
    title: "Thiết kế bộ biểu tượng sản phẩm",
    team: "Nhóm A",
    status: "To Do",
    assignmentMode: "Open Work",
    accountable: "Quản lý nhóm",
    priority: "Medium",
    progress: 0,
    deadlineLabel: "Còn 10 ngày",
    riskLevel: "Low",
    openBlockers: 0,
    requiredRole: "Designer",
    requiredSkills: ["Figma"],
    slots: 1,
    description: "Việc mở đủ điều kiện nhưng Member chưa gửi request.",
  },
];

// Fixture tổng quát theo schema ứng viên CWRM-15: R03 tạo Medium, priority High nâng lên High.
// Blocker vừa mở làm task Blocked, nhưng chưa kích hoạt rule thời lượng trong POC R01–R03.
export const demoRiskSnapshot: RiskSnapshot = {
  taskId: "TASK-103",
  riskLevel: "High",
  baseLevel: "Medium",
  evaluatedAt: "2026-11-10T03:00:00Z",
  ruleVersion: "candidate-v0.1-r01-r03",
  triggeredRules: ["R03"],
  inputFingerprint: "example-only-not-a-real-hash",
  evidence: [
    { id: "ev-01", source: "task", ruleId: "R03", field: "deadline", value: "2026-11-11T19:00:00Z" },
    { id: "ev-02", source: "evaluation", ruleId: "R03", field: "remainingHours", value: 40, unit: "hours" },
    { id: "ev-03", source: "task", ruleId: "R03", field: "progress", value: 30, unit: "percent" },
    { id: "ev-04", source: "impact", field: "priority", value: "High" },
  ],
};

// Chỉ để minh họa cách UI nhận biết snapshot cũ; fingerprint thật do API CWRM-11 chốt.
export const demoCurrentInputFingerprint = "example-only-not-a-real-hash";
