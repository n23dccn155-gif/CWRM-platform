import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { TaskTable } from "@/components/task-table";
import { listTasks, usingDemoData } from "@/lib/api/client";

export default async function TasksPage() {
  const demoTasks = await listTasks();
  return (
    <AppShell>
      <PageHeading
        eyebrow="Manager / Công việc"
        title="Danh sách công việc"
        description="Task Status, trạng thái nhận việc và mức risk là ba dữ liệu khác nhau."
        action={<Link className="button button-primary" href="/tasks/new">+ Tạo công việc</Link>}
      />
      <section className="panel">
        <div className="section-header"><h2>Tất cả task</h2><span className="count-label">{demoTasks.length} công việc{usingDemoData ? " minh họa" : ""}</span></div>
        <TaskTable tasks={demoTasks} />
      </section>
      {usingDemoData && <p className="helper-note">Bảng này hiển thị dữ liệu mẫu. Quyền xem theo team và bộ lọc cần được backend kiểm tra.</p>}
    </AppShell>
  );
}
