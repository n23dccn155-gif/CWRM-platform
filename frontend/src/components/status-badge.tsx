import type { AssignmentStatus, RequestStatus, RiskLevel, SnapshotRiskLevel, TaskStatus } from "@/lib/demo-data";

type BadgeValue = TaskStatus | AssignmentStatus | RequestStatus | RiskLevel | SnapshotRiskLevel | "Direct" | "Open Work" | "Được phép Start" | "Start bị khóa";

const tone: Record<BadgeValue, string> = {
  "To Do": "neutral",
  "In Progress": "info",
  Blocked: "danger",
  Review: "warning",
  Done: "success",
  "Pending Acceptance": "warning",
  Accepted: "success",
  Declined: "neutral",
  Pending: "warning",
  Approved: "success",
  Rejected: "danger",
  Withdrawn: "neutral",
  Low: "success",
  Medium: "warning",
  High: "danger",
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
  Direct: "info",
  "Open Work": "violet",
  "Được phép Start": "success",
  "Start bị khóa": "warning",
};

export function StatusBadge({ value }: { value: BadgeValue }) {
  return <span className={`status-badge status-${tone[value]}`}>{value}</span>;
}
