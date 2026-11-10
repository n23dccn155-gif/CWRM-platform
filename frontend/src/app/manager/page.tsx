import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { TaskTable } from "@/components/task-table";
import { demoTasks } from "@/lib/demo-data";

export default function ManagerPage() {
  const highRisk = demoTasks.filter((task) => task.riskLevel === "High");
  const blocked = demoTasks.filter((task) => task.status === "Blocked");
  const inProgress = demoTasks.filter((task) => task.status === "In Progress");
  const awaitingReview = demoTasks.filter((task) => task.status === "Review");

  return (
    <AppShell>
      <PageHeading
        eyebrow="Manager / Tổng quan"
        title="Biết việc nào cần can thiệp"
        description="Theo dõi trạng thái công việc, người chịu trách nhiệm và bằng chứng rủi ro trong cùng một nơi."
        action={<Link className="button button-primary" href="/tasks/new">+ Tạo công việc</Link>}
      />

      <section className="metric-grid" aria-label="Chỉ số tổng quan">
        <div className="metric-card"><span>Tổng công việc</span><strong>{demoTasks.length}</strong><small>Trong workspace minh họa</small></div>
        <div className="metric-card"><span>Đang thực hiện</span><strong>{inProgress.length}</strong><small>Task Status: In Progress</small></div>
        <div className="metric-card"><span>Đang nghẽn</span><strong>{blocked.length}</strong><small>Có blocker mở</small></div>
        <div className="metric-card metric-alert"><span>Risk High</span><strong>{highRisk.length}</strong><small>Cần xem evidence</small></div>
      </section>

      <section className="panel section-gap">
        <div className="section-header">
          <div><p className="eyebrow">Ưu tiên xử lý</p><h2>Rủi ro có bằng chứng</h2></div>
          <Link href="/risk" className="text-link">Xem chi tiết →</Link>
        </div>
        {highRisk.map((task) => (
          <div className="risk-row" key={task.id}>
            <div className="risk-indicator" aria-hidden="true" />
            <div className="risk-row-main">
              <strong>{task.title}</strong>
              <span>{task.id} · {task.team} · R: {task.responsible}</span>
            </div>
            <div className="risk-row-evidence">{task.deadlineLabel} · Progress {task.progress}% · Priority {task.priority}</div>
            <StatusBadge value={task.riskLevel} />
          </div>
        ))}
      </section>

      <section className="panel section-gap">
        <div className="section-header">
          <div><p className="eyebrow">Quyết định của A</p><h2>Chờ nghiệm thu</h2></div>
          <Link href="/review" className="text-link">{awaitingReview.length} task · Xem luồng →</Link>
        </div>
        <TaskTable tasks={awaitingReview} />
        <p className="helper-note">Review chưa phải Done. A cần duyệt hoặc trả lại có lý do; các nút xử lý thật chờ API.</p>
      </section>

      <section className="panel section-gap">
        <div className="section-header">
          <div><p className="eyebrow">Tổng hợp</p><h2>Công việc gần đây</h2></div>
          <Link href="/tasks" className="text-link">Xem tất cả →</Link>
        </div>
        <TaskTable tasks={demoTasks.slice(0, 4)} />
      </section>
    </AppShell>
  );
}
