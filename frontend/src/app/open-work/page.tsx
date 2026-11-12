import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoMemberProfile, missingOpenWorkRequirements } from "@/lib/demo-data";
import { listTasks } from "@/lib/api/client";

export default async function OpenWorkPage() {
  const opportunities = (await listTasks())
    .filter((task) => task.assignmentMode === "Open Work" && task.status === "To Do" && demoMemberProfile.teams.includes(task.team) && (task.reservedPeople ?? 0) < (task.requiredPeople ?? task.slots ?? 1))
    .map((task) => ({ ...task, missingRequirements: missingOpenWorkRequirements(task) }));
  return (
    <AppShell>
      <PageHeading
        eyebrow="Member / Open Work"
        title="Tìm việc phù hợp năng lực"
        description="Member thuộc team xem việc mở, kiểm tra Role/Skill rồi gửi request; Manager quyết định duyệt khi còn chỗ."
      />
      <p className="demo-context">Member minh họa: {demoMemberProfile.name} · {demoMemberProfile.teams.join(", ")} · Role {demoMemberProfile.role} · Skill {demoMemberProfile.skills.join(", ")}</p>
      <div className="card-grid">
        {opportunities.map((item) => (
          <article className="panel opportunity-card" key={item.id}>
            <div className="task-card-top"><span className="task-id">{item.id} · {item.team}</span><span className="count-label">Đã giữ {item.reservedPeople ?? 0}/{item.requiredPeople ?? item.slots ?? 1} vị trí</span></div>
            <h2>{item.title}</h2>
            <div className="requirement-row"><span>Role: <strong>{item.requiredRole}</strong></span><span>Skill: <strong>{item.requiredSkills?.join(", ")}</strong></span></div>
            {item.missingRequirements.length === 0 ? (
              <div className="eligibility success">
                <strong>Đủ điều kiện</strong>
                <span>{item.requestStatus === "Pending" ? "Request đã gửi, chờ Manager xem xét. Pending chưa tạo R." : "Có thể gửi request; Manager sẽ kiểm tra lại điều kiện và số chỗ."}</span>
                {item.requestStatus === "Pending" && <StatusBadge value="Pending" />}
              </div>
            ) : (
              <div className="eligibility danger"><strong>Chưa đủ điều kiện</strong><span>{item.missingRequirements.join(" · ")}</span></div>
            )}
            {item.requestStatus === "Pending" ? (
              <div className="button-row"><Link className="button button-secondary" href={`/tasks/${item.id}`}>Xem request và task</Link><button className="button button-secondary" disabled title="Chờ API">Rút request</button></div>
            ) : item.missingRequirements.length === 0 ? (
              <div className="button-row"><Link className="button button-secondary" href={`/tasks/${item.id}`}>Xem task</Link><button className="button button-primary" disabled>Gửi request</button></div>
            ) : (
              <button className="button button-secondary" disabled>Không thể gửi request</button>
            )}
          </article>
        ))}
      </div>
      <p className="helper-note">Nút gửi request đang khóa vì chưa có API. Eligibility phải được backend kiểm tra lại khi gửi và khi Manager duyệt; thẻ này chỉ minh họa trạng thái UI.</p>
    </AppShell>
  );
}
