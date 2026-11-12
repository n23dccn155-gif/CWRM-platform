import type { AssignmentStatus, RequestStatus, RiskLevel, SnapshotRiskLevel, TaskStatus } from "@/lib/demo-data";

export type BadgeKind =
  | "taskStatus"
  | "assignmentStatus"
  | "requestStatus"
  | "riskLevel"
  | "priority"
  | "assignmentMode"
  | "actionGuard";

export type BadgeValue =
  | TaskStatus
  | AssignmentStatus
  | RequestStatus
  | RiskLevel
  | SnapshotRiskLevel
  | "Direct"
  | "Open Work"
  | "Được phép Start"
  | "Start bị khóa"
  | "TO_DO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "REVIEW"
  | "DONE"
  | "PENDING_ACCEPTANCE"
  | "ACCEPTED"
  | "DECLINED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "WITHDRAWN"
  | "DIRECT"
  | "OPEN_WORK"
  | "CRITICAL"
  | "FIXED"
  | "FLEXIBLE"
  | "CAN_START"
  | "START_BLOCKED"
  | string;

interface BadgeConfig {
  label: string;
  tone: "neutral" | "info" | "warning" | "danger" | "success" | "violet";
}

const taskStatusMap: Record<string, BadgeConfig> = {
  TO_DO: { label: "To Do", tone: "neutral" },
  "To Do": { label: "To Do", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "info" },
  "In Progress": { label: "In Progress", tone: "info" },
  BLOCKED: { label: "Blocked", tone: "danger" },
  Blocked: { label: "Blocked", tone: "danger" },
  REVIEW: { label: "Review", tone: "warning" },
  Review: { label: "Review", tone: "warning" },
  DONE: { label: "Done", tone: "success" },
  Done: { label: "Done", tone: "success" },
};

const assignmentStatusMap: Record<string, BadgeConfig> = {
  PENDING_ACCEPTANCE: { label: "Pending Acceptance", tone: "warning" },
  "Pending Acceptance": { label: "Pending Acceptance", tone: "warning" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  Accepted: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "neutral" },
  Declined: { label: "Declined", tone: "neutral" },
};

const requestStatusMap: Record<string, BadgeConfig> = {
  PENDING: { label: "Pending", tone: "warning" },
  Pending: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  Approved: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  Rejected: { label: "Rejected", tone: "danger" },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral" },
  Withdrawn: { label: "Withdrawn", tone: "neutral" },
};

const riskLevelMap: Record<string, BadgeConfig> = {
  LOW: { label: "Low", tone: "success" },
  Low: { label: "Low", tone: "success" },
  MEDIUM: { label: "Medium", tone: "warning" },
  Medium: { label: "Medium", tone: "warning" },
  HIGH: { label: "High", tone: "danger" },
  High: { label: "High", tone: "danger" },
};

const priorityMap: Record<string, BadgeConfig> = {
  LOW: { label: "Low", tone: "neutral" },
  Low: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  Medium: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  High: { label: "High", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "danger" },
  Critical: { label: "Critical", tone: "danger" },
};

const assignmentModeMap: Record<string, BadgeConfig> = {
  DIRECT: { label: "Direct", tone: "info" },
  Direct: { label: "Direct", tone: "info" },
  OPEN_WORK: { label: "Open Work", tone: "violet" },
  "Open Work": { label: "Open Work", tone: "violet" },
};

const actionGuardMap: Record<string, BadgeConfig> = {
  CAN_START: { label: "Được phép Start", tone: "success" },
  "Được phép Start": { label: "Được phép Start", tone: "success" },
  START_BLOCKED: { label: "Start bị khóa", tone: "warning" },
  "Start bị khóa": { label: "Start bị khóa", tone: "warning" },
};

const kindMaps: Record<BadgeKind, Record<string, BadgeConfig>> = {
  taskStatus: taskStatusMap,
  assignmentStatus: assignmentStatusMap,
  requestStatus: requestStatusMap,
  riskLevel: riskLevelMap,
  priority: priorityMap,
  assignmentMode: assignmentModeMap,
  actionGuard: actionGuardMap,
};

function resolveConfig(value: BadgeValue, kind?: BadgeKind): BadgeConfig {
  const key = String(value);
  if (kind && kindMaps[kind]?.[key]) {
    return kindMaps[kind][key];
  }
  return (
    taskStatusMap[key] ??
    riskLevelMap[key] ??
    assignmentStatusMap[key] ??
    requestStatusMap[key] ??
    assignmentModeMap[key] ??
    actionGuardMap[key] ??
    priorityMap[key] ?? { label: key, tone: "neutral" }
  );
}

type DotTone = "danger" | "warning" | "success" | "info" | "violet" | "neutral";

function resolveDotTone(tone: BadgeConfig["tone"], rawValue: string): DotTone {
  const normalized = rawValue.toUpperCase().trim();
  // Đỏ: High / Blocked, Critical, Rejected
  if (
    tone === "danger" ||
    normalized === "HIGH" ||
    normalized === "BLOCKED" ||
    normalized === "CRITICAL" ||
    normalized === "REJECTED"
  ) {
    return "danger";
  }
  // Vàng: Medium / Warning, Review, Pending, Start bị khóa
  if (
    tone === "warning" ||
    normalized === "MEDIUM" ||
    normalized === "WARNING" ||
    normalized === "REVIEW" ||
    normalized.includes("PENDING") ||
    normalized.includes("START BỊ KHÓA") ||
    normalized === "START_BLOCKED"
  ) {
    return "warning";
  }
  // Xanh: Done / Accepted / Low, Approved, Được phép Start
  if (
    tone === "success" ||
    normalized === "DONE" ||
    normalized === "ACCEPTED" ||
    normalized === "LOW" ||
    normalized === "APPROVED" ||
    normalized.includes("ĐƯỢC PHÉP START") ||
    normalized === "CAN_START"
  ) {
    return "success";
  }
  if (tone === "info") {
    return "info";
  }
  if (tone === "violet") {
    return "violet";
  }
  return "neutral";
}

const dotColorClasses: Record<DotTone, string> = {
  danger: "status-badge-dot-danger bg-red-500",
  warning: "status-badge-dot-warning bg-amber-500",
  success: "status-badge-dot-success bg-emerald-500",
  info: "status-badge-dot-info bg-sky-500",
  violet: "status-badge-dot-violet bg-purple-500",
  neutral: "status-badge-dot-neutral bg-slate-400",
};

export function StatusBadge({
  value,
  kind,
  label,
  className = "",
}: {
  value: BadgeValue;
  kind?: BadgeKind;
  label?: string;
  className?: string;
}) {
  const config = resolveConfig(value, kind);
  const dotTone = resolveDotTone(config.tone, String(value));
  const dotClass = dotColorClasses[dotTone];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={`status-badge status-${config.tone} px-2 py-0.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 ${className}`.trim()}
    >
      <span className={`status-badge-dot ${dotClass}`} aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  );
}
