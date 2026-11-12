import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { TaskTable } from "@/components/task-table";
import { listTasks } from "@/lib/api/client";

export default async function ManagerPage() {
  const demoTasks = await listTasks();
  const interventionTasks = demoTasks.filter(
    (task) =>
      task.riskLevel === "High" ||
      task.riskLevel === "Medium" ||
      task.riskLevel === "HIGH" ||
      task.riskLevel === "MEDIUM"
  );
  const highRisk = interventionTasks.filter((task) => task.riskLevel === "High" || task.riskLevel === "HIGH");
  const blocked = demoTasks.filter((task) => task.status === "Blocked" || task.status === "BLOCKED");
  const inProgress = demoTasks.filter((task) => task.status === "In Progress" || task.status === "IN_PROGRESS");
  const awaitingReview = demoTasks.filter((task) => task.status === "Review" || task.status === "REVIEW");

  return (
    <AppShell>
      <style>{`
        .mgr-metrics .metric-card { min-height: 104px; padding: 15px 17px; }
        .mgr-metrics .metric-card .mgr-metric-label { font-size: 11.5px; font-weight: 700; color: var(--muted); }
        .mgr-metrics .metric-card strong { margin-top: 8px; font-size: 34px; font-weight: 800; letter-spacing: -.055em; line-height: .95; }
        .mgr-metrics .metric-card small { margin-top: 10px; font-size: 10.5px; }
        .mgr-metrics .metric-card .mgr-risk-tag { display: inline-flex; align-items: center; gap: 5px; width: fit-content; margin-top: 8px; padding: 3px 8px; border-radius: 100px; background: var(--danger-soft); color: var(--danger); font-size: 10.5px; font-weight: 800; letter-spacing: .01em; }
        .mgr-risk-tag::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .mgr-review-list { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .mgr-review-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 13px; background: var(--card); border-bottom: 1px solid var(--border-soft); transition: background .15s ease; }
        .mgr-review-row:last-child { border-bottom: 0; }
        .mgr-review-row:hover { background: var(--card-soft); }
        .mgr-review-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .mgr-review-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .mgr-code { flex-shrink: 0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-variant-numeric: tabular-nums; font-size: 10.5px; font-weight: 700; letter-spacing: .02em; color: var(--faint); }
        .mgr-review-title { color: var(--heading); font-size: 13px; font-weight: 750; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mgr-review-title:hover { color: var(--accent-text); }
        .mgr-review-meta { color: var(--muted); font-size: 10.5px; }
        .mgr-review-action { flex-shrink: 0; min-height: 33px; padding: 0 13px; border-radius: 7px; font-size: 12px; }
        @media (max-width: 640px) {
          .mgr-review-row { align-items: flex-start; flex-direction: column; }
          .mgr-review-title { white-space: normal; }
          .mgr-review-action { width: 100%; }
        }
      `}</style>
      <PageHeading
        eyebrow="TỔNG QUAN / MANAGER"
        title="Việc cần bạn quyết định"
        description="Ưu tiên xử lý rủi ro và nghiệm thu trước; toàn bộ công việc nằm ở danh sách bên dưới."
        action={<Link className="button button-primary" href="/tasks/new">+ Tạo công việc</Link>}
      />

      <section className="panel priority-panel">
        <div className="section-header">
          <div><p className="eyebrow">01 / ƯU TIÊN</p><h2>Công việc có rủi ro</h2></div>
          <Link href="/risk" className="text-link">Xem bằng chứng ({interventionTasks.length}) →</Link>
        </div>
        <p className="section-intro">Chỉ hiện mức Trung bình và Cao. Mở từng công việc để xem dữ liệu dẫn đến cảnh báo.</p>
        {interventionTasks.map((task) => (
          <Link className={`risk-row ${task.riskLevel === "Medium" || task.riskLevel === "MEDIUM" ? "risk-row-medium" : ""}`} key={task.id} href={`/tasks/${task.id}`}>
            <div className="risk-indicator" aria-hidden="true" />
            <div className="risk-row-main">
              <strong>{task.title}</strong>
              <span>{task.id} · {task.team} · Người thực hiện: {task.responsible ?? "Chưa có"}</span>
            </div>
            <div className="risk-row-evidence">Hạn {task.deadlineLabel} · Tiến độ {task.progress}%</div>
            <StatusBadge kind="riskLevel" value={task.riskLevel} />
          </Link>
        ))}
      </section>

      <section className="panel section-gap" aria-labelledby="review-queue-heading">
        <div className="section-header">
          <div><p className="eyebrow">02 / NGHIỆM THU</p><h2 id="review-queue-heading">Hàng chờ Review của A</h2></div>
          <Link href="/review" className="text-link">Toàn bộ hàng chờ ({awaitingReview.length}) →</Link>
        </div>
        {awaitingReview.length > 0 ? (
          <div className="mgr-review-list">
            {awaitingReview.map((task) => (
              <div className="mgr-review-row" key={task.id}>
                <div className="mgr-review-main">
                  <div className="mgr-review-line">
                    <span className="mgr-code">{task.id}</span>
                    <Link href={`/tasks/${task.id}`} className="mgr-review-title">{task.title}</Link>
                  </div>
                  <span className="mgr-review-meta">{task.team} · Progress {task.progress}% · {task.openBlockers} blocker mở</span>
                </div>
                <Link href={`/tasks/${task.id}`} className="button button-primary mgr-review-action">Xem nghiệm thu</Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-note">Không có task nào đang chờ A nghiệm thu.</p>
        )}
        <p className="helper-note">Trạng thái Review cần A duyệt Done hoặc trả lại kèm lý do. Progress 100% không tự chuyển Done.</p>
      </section>

      <section className="metric-grid section-gap mgr-metrics" aria-label="Chỉ số tổng quan">
        <div className="metric-card">
          <span className="mgr-metric-label">Tổng công việc</span>
          <strong>{demoTasks.length}</strong>
          <small>Trong workspace minh họa</small>
        </div>
        <div className="metric-card">
          <span className="mgr-metric-label">Đang thực hiện</span>
          <strong>{inProgress.length}</strong>
          <small>Đã bắt đầu</small>
        </div>
        <div className="metric-card">
          <span className="mgr-metric-label">Đang nghẽn</span>
          <strong>{blocked.length}</strong>
          <small>Có blocker cần giải quyết</small>
        </div>
        <div className="metric-card metric-alert">
          <span className="mgr-metric-label">Rủi ro Cao</span>
          <strong>{highRisk.length}</strong>
          <span className="mgr-risk-tag">R03 · 40 giờ · 30%</span>
        </div>
      </section>

      <section className="panel section-gap">
        <div className="section-header">
          <div><p className="eyebrow">03 / TỔNG HỢP</p><h2>Công việc gần đây</h2></div>
          <Link href="/tasks" className="text-link">Xem tất cả →</Link>
        </div>
        <TaskTable tasks={demoTasks.slice(0, 4)} />
      </section>
    </AppShell>
  );
}
