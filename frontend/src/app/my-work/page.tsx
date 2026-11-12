"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoDirectMemberProfile, demoTasks, type TaskSummary } from "@/lib/demo-data";
import { listTasks } from "@/lib/api/client";

interface UpdateDraft {
  progress: number;
  effort: string;
}

const sliderStyle: CSSProperties = { width: "100%", height: 26, accentColor: "var(--accent)" };

const clusterStyle: CSSProperties = {
  display: "grid",
  gap: 12,
  padding: "14px",
  marginTop: 14,
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "var(--card-soft)",
};

const sliderRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(104px, 132px) minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
};

const loadingNote: CSSProperties = { margin: 0 };

export default function MyWorkPage() {
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, UpdateDraft>>({});

  useEffect(() => {
    let active = true;
    listTasks()
      .then((data) => {
        if (active) setTasks(data);
      })
      .catch(() => {
        if (active) setTasks(demoTasks);
      });
    return () => {
      active = false;
    };
  }, []);

  const loaded = tasks !== null;
  const list = tasks ?? [];
  const invitation = list.find(
    (task) =>
      task.assignmentMode === "Direct" &&
      task.assignee === demoDirectMemberProfile.name &&
      task.assignmentStatus === "Pending Acceptance"
  );
  const assigned = list.filter(
    (task) => task.assignmentStatus === "Accepted" && task.responsible === demoDirectMemberProfile.name
  );

  function draftFor(task: TaskSummary): UpdateDraft {
    return drafts[task.id] ?? { progress: task.progress, effort: "" };
  }

  function updateDraft(task: TaskSummary, patch: Partial<UpdateDraft>) {
    setDrafts((prev) => {
      const base = prev[task.id] ?? { progress: task.progress, effort: "" };
      return { ...prev, [task.id]: { ...base, ...patch } };
    });
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Member / Việc của tôi"
        title="Biết việc nào mình đã nhận"
        description="Lời mời nhận việc và task đang thực hiện được tách riêng, để Accepted không bị hiểu là Task Status."
      />
      <p className="demo-context">Member minh họa: {demoDirectMemberProfile.name} · {demoDirectMemberProfile.teams.join(", ")}</p>

      <section aria-labelledby="direct-invitation-heading">
        <div className="section-header">
          <div>
            <p className="eyebrow">Direct invitation</p>
            <h2 id="direct-invitation-heading">Lời mời trực tiếp đang chờ</h2>
          </div>
          {invitation && <StatusBadge value="Pending Acceptance" />}
        </div>
        {!loaded ? (
          <div className="panel"><p className="helper-note" style={loadingNote}>Đang tải lời mời và công việc…</p></div>
        ) : invitation ? (
          <div className="panel invitation-panel">
            <div className="task-card-top">
              <span className="task-id">{invitation.id} · {invitation.team}</span>
              <span className="badge-row">
                <StatusBadge value="Direct" />
                <StatusBadge value={invitation.status} />
              </span>
            </div>
            <h3 style={{ marginBottom: 10 }}>{invitation.title}</h3>
            <p>Task vẫn <strong>To Do</strong>. Nếu chấp nhận, bạn trở thành R; task chỉ bắt đầu khi điều kiện dependency cho phép.</p>
            <label className="field">Lý do từ chối (bắt buộc khi Decline)<textarea rows={2} disabled placeholder="Nhập lý do để Manager có thể giao lại" /></label>
            <div className="button-row">
              <Link className="button button-secondary" href={`/tasks/${invitation.id}`}>Xem chi tiết</Link>
              <button className="button button-primary" disabled>Chấp nhận</button>
              <button className="button button-secondary" disabled>Từ chối</button>
              <span className="muted">Chưa kết nối API</span>
            </div>
          </div>
        ) : (
          <div className="panel">
            <p className="helper-note" style={loadingNote}>Không có lời mời Direct nào đang chờ bạn phản hồi.</p>
          </div>
        )}
      </section>

      <section className="section-gap" aria-labelledby="my-tasks-heading">
        <div className="section-header">
          <div>
            <p className="eyebrow">Assignment Accepted</p>
            <h2 id="my-tasks-heading">Công việc của tôi</h2>
          </div>
          <div className="button-row">
            <span className="count-label">{loaded ? `${assigned.length} việc đã nhận` : "Đang đếm…"}</span>
            <Link className="text-link" href="/open-work">Xem việc mở →</Link>
          </div>
        </div>
        {!loaded ? (
          <div className="card-grid">
            <div className="panel task-card"><p className="helper-note" style={loadingNote}>Đang tải công việc…</p></div>
          </div>
        ) : assigned.length === 0 ? (
          <div className="panel">
            <p className="helper-note" style={loadingNote}>Bạn chưa nhận task nào. Ghé trang việc mở để gửi request.</p>
          </div>
        ) : (
          <div className="card-grid">
            {assigned.map((task) => {
              const draft = draftFor(task);
              const effortValue = Number(draft.effort) || 0;
              const effortMax = Math.max(40, Math.ceil(effortValue / 10) * 10);
              return (
                <article className="panel task-card" key={task.id}>
                  <div className="task-card-top"><span className="task-id">{task.id} · {task.team}</span><StatusBadge value={task.riskLevel} /></div>
                  <h3>{task.title}</h3>
                  <div className="badge-row"><StatusBadge value={task.status} /><StatusBadge value="Accepted" /></div>
                  <p>A: {task.accountable} · {task.deadlineLabel}</p>
                  <div className="progress-header"><span>Tiến độ</span><strong>{draft.progress}%</strong></div>
                  <div className="progress-track"><span style={{ width: `${draft.progress}%` }} /></div>
                  {task.openBlockers > 0 && <p className="warning-line">{task.openBlockers} blocker đang mở — chưa thể gửi Review.</p>}
                  {task.predecessorId && list.find((item) => item.id === task.predecessorId)?.status !== "Done" && <p className="warning-line">Chờ {task.predecessorId} Done — chưa thể Start.</p>}
                  {task.status === "To Do" && <button className="button button-primary" disabled title="Chờ API và kiểm tra dependency">Start</button>}
                  {task.status === "In Progress" && (
                    <div style={clusterStyle}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <span className="eyebrow" style={{ margin: 0 }}>Cập nhật của R</span>
                        <span className="count-label" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {draft.progress}% · {draft.effort || "0"} giờ
                        </span>
                      </div>
                      <div style={sliderRowStyle}>
                        <label className="field" style={{ gap: 4 }}>
                          Progress (%)
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={draft.progress}
                            onChange={(event) => updateDraft(task, { progress: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
                          />
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={draft.progress}
                          style={sliderStyle}
                          aria-label="Thanh trượt tiến độ"
                          onChange={(event) => updateDraft(task, { progress: Number(event.target.value) })}
                        />
                      </div>
                      <div style={sliderRowStyle}>
                        <label className="field" style={{ gap: 4 }}>
                          Effort (giờ)
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={draft.effort}
                            placeholder="0"
                            onChange={(event) => updateDraft(task, { effort: event.target.value })}
                          />
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={effortMax}
                          step={0.5}
                          value={effortValue}
                          style={sliderStyle}
                          aria-label="Thanh trượt số giờ"
                          onChange={(event) => updateDraft(task, { effort: event.target.value })}
                        />
                      </div>
                      <div className="button-row">
                        <button className="button button-primary" style={{ marginTop: 0 }} disabled title="Chờ API cập nhật tiến độ và effort">
                          Lưu tiến độ
                        </button>
                        <span className="count-label">Nháp tại phiên — chưa ghi server.</span>
                      </div>
                    </div>
                  )}
                  <Link className="button button-secondary" href={`/tasks/${task.id}`}>{task.status === "Review" ? "Xem trạng thái nghiệm thu" : "Xem chi tiết công việc"}</Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
