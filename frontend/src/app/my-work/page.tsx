import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoMemberProfile, demoTasks } from "@/lib/demo-data";

export default function MyWorkPage() {
  const invitation = demoTasks.find((task) => task.assignmentMode === "Direct" && task.assignee === demoMemberProfile.name && task.assignmentStatus === "Pending Acceptance");
  const assigned = demoTasks.filter((task) => task.assignmentStatus === "Accepted" && task.responsible === demoMemberProfile.name);

  return (
    <AppShell>
      <PageHeading
        eyebrow="Member / Việc của tôi"
        title="Biết việc nào mình đã nhận"
        description="Lời mời nhận việc và task đang thực hiện được tách riêng, để Accepted không bị hiểu là Task Status."
      />
      <p className="demo-context">Member minh họa: {demoMemberProfile.name} · {demoMemberProfile.teams.join(", ")}</p>
      {invitation && (
        <section className="panel invitation-panel">
          <div className="section-header"><div><p className="eyebrow">Lời mời Direct</p><h2>{invitation.title}</h2></div><StatusBadge value="Pending Acceptance" /></div>
          <p>Task vẫn <strong>To Do</strong>. Nếu chấp nhận, bạn trở thành R; task chỉ bắt đầu khi điều kiện dependency cho phép.</p>
          <div className="button-row"><Link className="button button-secondary" href={`/tasks/${invitation.id}`}>Xem chi tiết</Link><button className="button button-primary" disabled>Chấp nhận</button><button className="button button-secondary" disabled>Từ chối</button><span className="muted">Chưa kết nối API</span></div>
        </section>
      )}
      <section className="section-gap">
        <div className="section-header"><div><p className="eyebrow">Assignment Accepted</p><h2>Công việc đã nhận</h2></div><Link className="text-link" href="/open-work">Xem việc mở →</Link></div>
        <div className="card-grid">
          {assigned.map((task) => (
            <article className="panel task-card" key={task.id}>
              <div className="task-card-top"><span className="task-id">{task.id} · {task.team}</span><StatusBadge value={task.riskLevel} /></div>
              <h3>{task.title}</h3>
              <div className="badge-row"><StatusBadge value={task.status} /><StatusBadge value="Accepted" /></div>
              <p>A: {task.accountable} · {task.deadlineLabel}</p>
              <div className="progress-header"><span>Tiến độ</span><strong>{task.progress}%</strong></div>
              <div className="progress-track"><span style={{ width: `${task.progress}%` }} /></div>
              {task.openBlockers > 0 && <p className="warning-line">{task.openBlockers} blocker đang mở — chưa thể gửi Review.</p>}
              {task.predecessorId && demoTasks.find((item) => item.id === task.predecessorId)?.status !== "Done" && <p className="warning-line">Chờ {task.predecessorId} Done — chưa thể Start.</p>}
              <Link className="button button-secondary" href={`/tasks/${task.id}`}>{task.status === "Review" ? "Xem trạng thái nghiệm thu" : "Xem chi tiết công việc"}</Link>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
