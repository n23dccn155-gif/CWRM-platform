import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { TaskSummary } from "@/lib/demo-data";

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function RoleAvatar({ name, role }: { name?: string; role: "A" | "R" }) {
  const label = name ?? "Chưa gán";
  return (
    <span
      className={`tt-avatar ${role === "A" ? "tt-avatar-navy" : "tt-avatar-teal"}`}
      data-name={`${role} · ${label}`}
      title={`${role} · ${label}`}
      aria-label={`${role}: ${label}`}
    >
      {initials(name)}
      <span className="tt-role-badge" aria-hidden="true">{role}</span>
    </span>
  );
}

export function AvatarStack({ accountable, responsible }: { accountable: string; responsible?: string }) {
  return (
    <span className="tt-avatar-stack" aria-label={`A: ${accountable || "Chưa gán"}; R: ${responsible ?? "Chưa gán"}`}>
      <RoleAvatar name={accountable} role="A" />
      <RoleAvatar name={responsible} role="R" />
    </span>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

export function TaskTable({ tasks }: { tasks: TaskSummary[] }) {
  return (
    <div className="table-scroll">
      <style>{`
        .tt-table { min-width: 940px; }
        .tt-table thead th { padding: 10px 12px; font-size: 10.5px; }
        .tt-table tbody tr.tt-row td { height: 44px; padding: 3px 12px; vertical-align: middle; }
        .tt-cell-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
        .tt-table .table-title { font-size: 12.5px; line-height: 1.2; }
        .tt-table .table-subtitle { display: flex; align-items: center; gap: 6px; margin-top: 0; font-size: 10px; line-height: 1.2; }
        .tt-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-variant-numeric: tabular-nums; font-size: 10px; font-weight: 700; letter-spacing: .02em; color: var(--faint); }
        .tt-avatar-stack { display: inline-flex; align-items: center; padding-left: 1px; }
        .tt-avatar { position: relative; display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--card); color: #ffffff; font-size: 9px; font-weight: 800; letter-spacing: -.02em; cursor: default; }
        .tt-avatar + .tt-avatar { margin-left: -9px; }
        .tt-avatar-navy { background: linear-gradient(135deg, #1f3a5f, #2f5d8f); z-index: 2; }
        .tt-avatar-teal { background: linear-gradient(135deg, #0f766e, #14b8a6); z-index: 1; }
        .tt-role-badge { position: absolute; right: -2px; bottom: -2px; display: grid; place-items: center; width: 12px; height: 12px; border-radius: 50%; border: 1.5px solid var(--card); color: #ffffff; font-size: 7.5px; font-weight: 800; }
        .tt-avatar-navy .tt-role-badge { background: #0f2a47; }
        .tt-avatar-teal .tt-role-badge { background: #0f766e; }
        .tt-avatar::after { content: attr(data-name); position: absolute; bottom: calc(100% + 7px); left: 50%; z-index: 50; padding: 4px 7px; border-radius: 6px; background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 650; white-space: nowrap; opacity: 0; visibility: hidden; pointer-events: none; transform: translate(-50%, 3px); box-shadow: 0 6px 16px #0f172a33; transition: opacity .12s ease, transform .12s ease; }
        .tt-avatar:hover::after { opacity: 1; visibility: visible; transform: translate(-50%, 0); }
        .tt-action-head { width: 76px; }
        .tt-action-cell { width: 76px; text-align: right; }
        .tt-actions { display: flex; justify-content: flex-end; gap: 5px; opacity: 0; transform: translateX(4px); transition: opacity .15s ease, transform .15s ease; }
        .tt-row:hover .tt-actions, .tt-row:focus-within .tt-actions { opacity: 1; transform: none; }
        .tt-quick { display: inline-grid; place-items: center; width: 26px; height: 26px; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text-2); }
        .tt-quick:hover { border-color: var(--accent-border); background: var(--accent-soft); color: var(--accent-text); }
        .tt-quick-primary { border-color: var(--accent-border); background: var(--accent-soft); color: var(--accent-text); }
        .tt-quick svg { width: 13px; height: 13px; }
      `}</style>
      <table className="data-table tt-table">
        <thead>
          <tr>
            <th>Công việc</th>
            <th>Task Status</th>
            <th>Hình thức</th>
            <th>Assignment / Request</th>
            <th>A / R</th>
            <th>Hạn</th>
            <th>Risk</th>
            <th className="tt-action-head"><span className="muted">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const inReview = task.status === "Review" || task.status === "REVIEW";
            return (
              <tr key={task.id} className="tt-row">
                <td>
                  <div className="tt-cell-main">
                    <Link href={`/tasks/${task.id}`} className="table-title">{task.title}</Link>
                    <span className="table-subtitle">
                      <span className="tt-code">{task.id}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.team}</span>
                    </span>
                  </div>
                </td>
                <td><StatusBadge value={task.status} /></td>
                <td><StatusBadge value={task.assignmentMode} /></td>
                <td>
                  {task.assignmentStatus ? <StatusBadge value={task.assignmentStatus} /> : task.requestStatus ? <StatusBadge value={task.requestStatus} /> : <span className="muted">Chưa có</span>}
                </td>
                <td><AvatarStack accountable={task.accountable} responsible={task.responsible} /></td>
                <td>{task.deadlineLabel}</td>
                <td><StatusBadge value={task.riskLevel} /></td>
                <td className="tt-action-cell">
                  <div className="tt-actions">
                    <Link href={`/tasks/${task.id}`} className="tt-quick" title="Mở chi tiết" aria-label={`Mở chi tiết ${task.id}`}>
                      <OpenIcon />
                    </Link>
                    {inReview && (
                      <Link href={`/tasks/${task.id}`} className="tt-quick tt-quick-primary" title="Xem nghiệm thu" aria-label={`Xem nghiệm thu ${task.id}`}>
                        <CheckIcon />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
