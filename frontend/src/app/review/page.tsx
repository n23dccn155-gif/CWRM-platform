import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { TaskTable } from "@/components/task-table";
import { listTasks } from "@/lib/api/client";

export default async function ReviewPage() {
  const demoTasks = await listTasks();
  const awaitingReview = demoTasks.filter((task) => task.status === "Review" || task.status === "REVIEW");
  const successors = demoTasks.filter((task) => task.predecessorId);

  return (
    <AppShell>
      <PageHeading
        eyebrow="Manager / Nghiệm thu và phụ thuộc"
        title="Quyết định Done, mở quyền Start"
        description="R gửi Review khi progress đạt 100% và không còn blocker. A nghiệm thu hoặc trả lại có lý do; task kế tiếp chỉ được phép Start sau khi tiền nhiệm Done."
      />

      <section className="panel" aria-labelledby="review-queue-heading">
        <div className="section-header">
          <div><p className="eyebrow">Quyết định của A</p><h2 id="review-queue-heading">Hàng chờ Review</h2></div>
          <span className="count-label">{awaitingReview.length} task</span>
        </div>
        <TaskTable tasks={awaitingReview} />
        {awaitingReview.map((task) => (
          <div className="dependency-row" key={`${task.id}-result`}>
            <div>
              <strong>{task.title}</strong>
              <p>Kết quả R nộp: {task.reviewResultText ?? "Chưa có mô tả văn bản"}</p>
              {task.reviewResultUrl && <a className="text-link" href={task.reviewResultUrl}>Mở liên kết kết quả</a>}
            </div>
            <Link className="button button-secondary" href={`/tasks/${task.id}`}>Xem quyết định của A</Link>
          </div>
        ))}
        <div className="rule-callout">
          <strong>Hai quyết định hợp lệ</strong>
          <span>Duyệt → Done. Trả lại → In Progress kèm lý do. Progress 100% và Risk High không tự quyết định thay A.</span>
        </div>
      </section>

      <section className="panel section-gap" aria-labelledby="dependency-list-heading">
        <div className="section-header">
          <div><p className="eyebrow">Finish-to-Start</p><h2 id="dependency-list-heading">Task phụ thuộc</h2></div>
          <span className="count-label">{successors.length} task</span>
        </div>
        <div className="dependency-list">
          {successors.map((task) => {
            const predecessor = demoTasks.find((item) => item.id === task.predecessorId);
            const unlocked = predecessor?.status === "Done";
            return (
              <div className="dependency-row" key={task.id}>
                <div>
                  <Link className="table-title" href={`/tasks/${task.id}`}>{task.id} · {task.title}</Link>
                  <p>Tiền nhiệm: {predecessor ? <Link className="text-link" href={`/tasks/${predecessor.id}`}>{predecessor.title}</Link> : task.predecessorId} · {predecessor?.status ?? "Chưa tìm thấy"}</p>
                </div>
                <div className="dependency-status">
                  <StatusBadge value={unlocked ? "Được phép Start" : "Start bị khóa"} />
                  <small>{unlocked ? "Member tự Start; hệ thống không tự chuyển In Progress." : "Chờ A duyệt tiền nhiệm Done."}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <p className="helper-note">Đây là bản xem trước với dữ liệu mẫu. Các quyết định nghiệp vụ và việc mở khóa Start cần backend kiểm tra quyền, điều kiện và ghi audit.</p>
    </AppShell>
  );
}
