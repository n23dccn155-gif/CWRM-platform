import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { TaskTable } from "@/components/task-table";
import { listTasks, usingDemoData } from "@/lib/api/client";

export default async function TasksPage() {
  const demoTasks = await listTasks();
  return (
    <AppShell>
      <style>{`
        .table-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin: -4px 0 14px; }
        .table-legend { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; color: var(--muted); font-size: 11.5px; font-weight: 600; }
        .table-legend > span { display: inline-flex; align-items: center; gap: 6px; }
        .legend-avatar { display: inline-grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; color: #ffffff; font-size: 8.5px; font-weight: 800; }
        .legend-avatar-a { background: #1f3a5f; }
        .legend-avatar-r { background: #0f766e; }
      `}</style>
      <PageHeading
        eyebrow="Manager / Công việc"
        title="Danh sách công việc"
        description="Task Status, trạng thái nhận việc và mức risk là ba dữ liệu khác nhau."
        action={<Link className="button button-primary" href="/tasks/new">+ Tạo công việc</Link>}
      />
      <section className="panel">
        <div className="section-header"><h2>Tất cả task</h2><span className="count-label">{demoTasks.length} công việc{usingDemoData ? " minh họa" : ""}</span></div>
        <div className="table-toolbar">
          <div className="table-legend">
            <span><span className="legend-avatar legend-avatar-a">A</span> Accountable · nghiệm thu</span>
            <span><span className="legend-avatar legend-avatar-r">R</span> Responsible · thực hiện</span>
          </div>
          <span className="count-label">Rê chuột lên dòng để mở thao tác nhanh</span>
        </div>
        <TaskTable tasks={demoTasks} />
      </section>
      {usingDemoData && <p className="helper-note">Bảng này hiển thị dữ liệu mẫu. Quyền xem theo team và bộ lọc cần được backend kiểm tra.</p>}
    </AppShell>
  );
}
