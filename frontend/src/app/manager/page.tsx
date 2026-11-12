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

      <section className="panel section-gap">
        <div className="section-header">
          <div><p className="eyebrow">02 / NGHIỆM THU</p><h2>Chờ bạn duyệt kết quả</h2></div>
          <Link href="/review" className="text-link">Xem hàng chờ ({awaitingReview.length}) →</Link>
        </div>
        <TaskTable tasks={awaitingReview} />
        <p className="helper-note">Trạng thái Review cần A nghiệm thu hoặc trả lại kèm lý do. Chức năng ghi dữ liệu sẽ nối khi API sẵn sàng.</p>
      </section>

      <section className="metric-grid section-gap" aria-label="Chỉ số tổng quan">
        <div className="metric-card"><span>Tổng công việc</span><strong>{demoTasks.length}</strong><small>Trong workspace minh họa</small></div>
        <div className="metric-card"><span>Đang thực hiện</span><strong>{inProgress.length}</strong><small>Đã bắt đầu</small></div>
        <div className="metric-card"><span>Đang nghẽn</span><strong>{blocked.length}</strong><small>Có blocker cần giải quyết</small></div>
        <div className="metric-card metric-alert"><span>Rủi ro Cao</span><strong>{highRisk.length}</strong><small>Cần xem bằng chứng</small></div>
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
