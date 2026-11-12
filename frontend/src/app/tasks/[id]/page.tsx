import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getRiskSnapshot, getTask, listTasks } from "@/lib/api/client";

export const instant = false;

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) notFound();
  const demoTasks = await listTasks();
  const demoRiskSnapshot = await getRiskSnapshot(id);
  const predecessor = task.predecessorId ? demoTasks.find((item) => item.id === task.predecessorId) : undefined;
  const waitingForDependency = Boolean(predecessor && predecessor.status !== "Done");
  const reviewReady = task.progress === 100 && task.openBlockers === 0;
  const assignments = task.assignments ?? [];
  const requests = task.requests ?? [];
  const requiredPeople = task.requiredPeople ?? task.slots ?? 1;
  const reservedPeople = task.reservedPeople ?? assignments.filter((item) => item.status === "Accepted" || item.status === "ACCEPTED").length;

  return (
    <AppShell>
      <PageHeading
        eyebrow={`${task.team} / ${task.id}`}
        title={task.title}
        description={task.description ?? "Trách nhiệm, trạng thái nhận việc, tiến độ và risk được theo dõi riêng."}
        action={<Link className="button button-secondary" href="/tasks">← Danh sách task</Link>}
      />
      <div className="two-column-layout">
        <section className="panel">
          <div className="section-header"><h2>Thông tin công việc</h2><div className="status-summary"><span>Task Status</span><StatusBadge value={task.status} /></div></div>
          <div className="detail-grid">
            <div><span>Hình thức</span><StatusBadge value={task.assignmentMode} /></div>
            <div><span>Priority</span><strong>{task.priority}</strong></div>
            <div><span>A chịu trách nhiệm</span><strong>{task.accountable}</strong></div>
            <div><span>R thực hiện</span><strong>{task.responsible ?? "Chưa có R Accepted"}</strong></div>
            {task.assignmentMode === "Direct" ? (
              <div><span>Assignment Status</span>{task.assignmentStatus ? <StatusBadge value={task.assignmentStatus} /> : <strong>Chưa gửi lời mời</strong>}</div>
            ) : (
              <>
                <div><span>Request Status</span>{task.requestStatus ? <StatusBadge value={task.requestStatus} /> : <strong>Chưa có request</strong>}</div>
                <div><span>Assignment Status</span>{task.assignmentStatus ? <StatusBadge value={task.assignmentStatus} /> : <strong>Chưa có R Accepted</strong>}</div>
              </>
            )}
            <div><span>Deadline</span><strong>{task.deadlineLabel}</strong></div>
            <div><span>Blocker mở</span><strong>{task.openBlockers}</strong></div>
            {predecessor && <div><span>Phụ thuộc</span><Link className="text-link" href={`/tasks/${predecessor.id}`}>{predecessor.title} · {predecessor.status}</Link></div>}
          </div>
          <div className="divider" />
          <div className="progress-header"><span>Progress</span><strong>{task.progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${task.progress}%` }} /></div>
          <p className="helper-note">Accepted không tự chuyển task sang In Progress. Progress 100% không tự chuyển task sang Done.</p>
        </section>
        <section className="panel">
          <div className="section-header"><h2>Rủi ro và hành động</h2><StatusBadge value={task.riskLevel} /></div>
          <p className="page-description">Risk được tính từ dữ liệu công việc. Manager không nhập Risk Score thủ công.</p>
          {demoRiskSnapshot ? (
            <Link href="/risk" className="button button-primary" style={{ marginTop: 22 }}>Xem evidence</Link>
          ) : (
            <p className="helper-note">Task này chưa có snapshot risk chi tiết.</p>
          )}
          <div className="divider" />
          <p className="helper-note">Risk Level là kết quả của Risk Engine. Blocked là Task Status; hai dữ liệu không thay thế nhau.</p>
        </section>
      </div>
      <section className="panel section-gap" aria-labelledby="assignment-heading">
        <div className="section-header">
          <div><p className="eyebrow">Luồng nhận việc</p><h2 id="assignment-heading">Phân công và trách nhiệm</h2></div>
          <StatusBadge value={task.assignmentMode} />
        </div>
        {task.assignmentMode === "Direct" ? (
          <div className="flow-stage-grid">
            <div className="flow-stage-card"><span>Người được đề nghị</span><strong>{task.assignee ?? "Chưa chọn"}</strong><small>Chỉ Member trong team mới có thể phản hồi.</small></div>
            <div className="flow-stage-card"><span>Trạng thái lời mời</span>{task.assignmentStatus ? <StatusBadge value={task.assignmentStatus} /> : <strong>Chưa gửi</strong>}<small>{task.assignmentStatus === "Accepted" ? "Accepted tạo R; không tự Start task." : "Chưa Accepted thì chưa tạo R."}</small></div>
            <div className="flow-stage-card"><span>Người thực hiện R</span><strong>{task.responsible ?? "Chưa có R"}</strong><small>Mỗi task vẫn có đúng một A: {task.accountable}.</small></div>
          </div>
        ) : (
          <div className="flow-stage-grid">
            <div className="flow-stage-card"><span>Điều kiện ứng tuyển</span><strong>{task.requiredRole ?? "Không yêu cầu role"} · {task.requiredSkills?.join(", ") ?? "Không yêu cầu skill"}</strong><small>Số vị trí: {task.slots ?? 1}</small></div>
            <div className="flow-stage-card"><span>Request của Member</span>{task.requestStatus ? <StatusBadge value={task.requestStatus} /> : <strong>Chưa có request</strong>}<small>{task.requestStatus === "Approved" ? "Manager đã duyệt request." : task.requestStatus === "Pending" ? "Pending chưa tạo Assignment Accepted hoặc R." : "Chưa có Member đủ điều kiện gửi request."}</small></div>
            <div className="flow-stage-card"><span>Assignment / R</span><strong>{task.responsible ?? "Chưa có R"}</strong><small>{task.assignmentStatus === "Accepted" ? "Approved đã tạo Assignment Accepted." : "Chỉ Approved khi còn chỗ mới tạo R."}</small></div>
          </div>
        )}
        <p className="helper-note">Các trạng thái và quyền trong phần này là mock UI; thao tác thật cần backend kiểm tra lại điều kiện và ghi audit.</p>
        <div className="divider" />
        <div className="section-header"><h3>Danh sách theo từng người</h3><span className="count-label">Cần {requiredPeople} · đã giữ {reservedPeople} · còn {Math.max(0, requiredPeople - reservedPeople)}</span></div>
        {assignments.map((item) => (
          <div className="dependency-row" key={item.id}>
            <div><strong>{item.userName}</strong><p>Assignment · {item.reason ? `Lý do: ${item.reason}` : "Chưa có lý do"}</p></div>
            <div className="button-row"><StatusBadge kind="assignmentStatus" value={item.status} /><button className="button button-secondary" disabled>Kết thúc + lý do</button></div>
          </div>
        ))}
        {requests.map((item) => (
          <div className="dependency-row" key={item.id}>
            <div><strong>{item.userName}</strong><p>Open Work request · {item.reason ? `Lý do: ${item.reason}` : "Chưa có lý do"}</p></div>
            <div className="button-row"><StatusBadge kind="requestStatus" value={item.status} /><button className="button button-primary" disabled>Duyệt</button><button className="button button-secondary" disabled>Từ chối + lý do</button></div>
          </div>
        ))}
        {assignments.length === 0 && requests.length === 0 && <p className="helper-note">Chưa có đề nghị, request hoặc assignment.</p>}
        <div className="form-grid section-gap">
          <label className="field">Lý do khi từ chối, đóng hoặc kết thúc<input disabled placeholder="Bắt buộc khi thực hiện thao tác" /></label>
          <div className="button-row"><button className="button button-secondary" disabled>Gửi đề nghị Direct</button><button className="button button-secondary" disabled>Đóng đề nghị Pending</button></div>
        </div>
        <p className="helper-note">Manager kiểm tra lại role/skill, số chỗ và phiên bản task khi duyệt. A là người nghiệm thu, không phải quyền duyệt request mặc định.</p>
      </section>
      {waitingForDependency && predecessor && (
        <section className="panel section-gap state-panel" aria-labelledby="dependency-heading">
          <div><p className="eyebrow">Finish-to-Start</p><h2 id="dependency-heading">Chưa thể bắt đầu task</h2><p>Task tiền nhiệm <Link className="text-link" href={`/tasks/${predecessor.id}`}>{predecessor.id}</Link> đang ở trạng thái <strong>{predecessor.status}</strong>. Chỉ khi tiền nhiệm được A duyệt Done thì task này mới được phép Start; hệ thống không tự bắt đầu thay Member.</p></div>
          <button className="button button-secondary" disabled>Start bị khóa</button>
        </section>
      )}
      {task.status === "Blocked" && (
        <section className="panel section-gap state-panel" aria-labelledby="blocker-heading">
          <div><p className="eyebrow">Blocker đang mở</p><h2 id="blocker-heading">Giải quyết trở ngại trước khi gửi Review</h2><p>Task có {task.openBlockers} blocker mở. Member có thể cập nhật tiến độ và báo vấn đề; Manager theo dõi evidence, can thiệp có lý do và hệ thống đánh giá lại risk.</p></div>
          <button className="button button-secondary" disabled>Gửi Review bị khóa</button>
        </section>
      )}
      {task.status === "In Progress" && (
        <section className="panel section-gap state-panel" aria-labelledby="submit-review-heading">
          <div>
            <p className="eyebrow">Member / Gửi nghiệm thu</p>
            <h2 id="submit-review-heading">{reviewReady ? "Đủ điều kiện gửi Review" : "Chưa đủ điều kiện gửi Review"}</h2>
            <p>Progress: <strong>{task.progress}%</strong> (cần 100%) · Blocker mở: <strong>{task.openBlockers}</strong> (cần 0). Khi R gửi Review, A mới xem xét và quyết định Done hoặc trả lại có lý do.</p>
          </div>
          <div className="form-grid">
            <label className="field">Kết quả dạng văn bản<textarea rows={3} disabled placeholder="Mô tả kết quả đã hoàn thành" /></label>
            <label className="field">Hoặc liên kết kết quả<input type="url" disabled placeholder="https://..." /></label>
            <div className="action-with-note"><button className="button button-primary" disabled>Gửi Review</button><small>{reviewReady ? "Chờ API để gửi" : "Cần hoàn tất điều kiện"}</small></div>
          </div>
        </section>
      )}
      {task.status === "Review" && (
        <section className="panel section-gap state-panel" aria-labelledby="review-heading">
          <div><p className="eyebrow">Nghiệm thu bởi A</p><h2 id="review-heading">Đã nộp kết quả, chờ quyết định</h2><p>R đã gửi Review khi đạt {task.progress}% và không còn blocker. A là {task.accountable}; A có thể duyệt Done hoặc trả về In Progress kèm lý do. Progress 100% không tự chuyển Done.</p></div>
          <div className="form-grid">
            <div><strong>Kết quả R đã nộp</strong><p>{task.reviewResultText ?? "Không có mô tả văn bản"}</p>{task.reviewResultUrl && <a className="text-link" href={task.reviewResultUrl}>Mở liên kết kết quả</a>}</div>
            <label className="field">Lý do trả lại<input disabled placeholder="Bắt buộc khi trả lại" /></label>
            <label className="field">Progress mới (0–99)<input type="number" min="0" max="99" disabled placeholder="Ví dụ: 80" /></label>
            <div className="button-row"><button className="button button-primary" disabled>Duyệt Done</button><button className="button button-secondary" disabled>Trả lại</button></div>
          </div>
        </section>
      )}
      <p className="helper-note">Các nút nghiệp vụ đang khóa vì chưa có API; bản xem trước không ghi thay đổi vào dữ liệu nhóm.</p>
    </AppShell>
  );
}
