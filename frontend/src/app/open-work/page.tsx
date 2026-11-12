import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoMemberProfile, missingOpenWorkRequirements } from "@/lib/demo-data";
import { listTasks } from "@/lib/api/client";

export default async function OpenWorkPage() {
  const tasks = await listTasks();
  const opportunities = tasks
    .filter((task) => {
      const required = task.requiredPeople ?? task.slots ?? 1;
      const reserved = task.reservedPeople ?? 0;
      return (
        task.assignmentMode === "Open Work" &&
        task.status === "To Do" &&
        demoMemberProfile.teams.includes(task.team) &&
        reserved < required
      );
    })
    .map((task) => {
      const required = task.requiredPeople ?? task.slots ?? 1;
      const reserved = task.reservedPeople ?? 0;
      const remainingSlots = Math.max(0, required - reserved);
      return {
        ...task,
        required,
        reserved,
        remainingSlots,
        missingRequirements: missingOpenWorkRequirements(task),
      };
    });

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
            <div className="task-card-top">
              <span className="task-id">{item.id} · {item.team}</span>
              <span className="count-label">Còn {item.remainingSlots}/{item.required} chỗ (đã giữ {item.reserved})</span>
            </div>
            <h2>{item.title}</h2>
            <div className="requirement-row"><span>Role: <strong>{item.requiredRole}</strong></span><span>Skill: <strong>{item.requiredSkills?.join(", ")}</strong></span></div>
            {item.missingRequirements.length === 0 ? (
              <div className="eligibility success">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Đủ điều kiện</strong>
                  {item.requestStatus && <StatusBadge kind="requestStatus" value={item.requestStatus} />}
                </div>
                <span>
                  {item.requestStatus === "Pending"
                    ? "Request đang Pending; chờ Manager duyệt. Pending chưa tạo Assignment Accepted hoặc R."
                    : item.requestStatus === "Withdrawn"
                    ? "Bạn đã rút request này. Có thể gửi lại nếu còn vị trí trống."
                    : "Đủ role/skill bắt buộc. Có thể gửi request để Manager xét duyệt khi còn chỗ."}
                </span>
              </div>
            ) : (
              <div className="eligibility danger"><strong>Chưa đủ điều kiện</strong><span>{item.missingRequirements.join(" · ")}</span></div>
            )}
            {item.requestStatus === "Pending" ? (
              <div className="button-row">
                <Link className="button button-secondary" href={`/tasks/${item.id}`}>Xem request và task</Link>
                <button className="button button-secondary" disabled title="Member có quyền rút request Pending; trạng thái chuyển Withdrawn">Rút request (Withdrawn)</button>
              </div>
            ) : item.requestStatus === "Withdrawn" ? (
              <div className="button-row">
                <Link className="button button-secondary" href={`/tasks/${item.id}`}>Xem task</Link>
                <button className="button button-primary" disabled title="Chờ API">Gửi lại request</button>
              </div>
            ) : item.missingRequirements.length === 0 ? (
              <div className="button-row">
                <Link className="button button-secondary" href={`/tasks/${item.id}`}>Xem task</Link>
                <button className="button button-primary" disabled>Gửi request</button>
              </div>
            ) : (
              <button className="button button-secondary" disabled>Không thể gửi request</button>
            )}
          </article>
        ))}
      </div>
      <p className="helper-note">Nút gửi/rút request đang khóa vì chưa có API. Eligibility phải được backend kiểm tra lại khi gửi và khi Manager duyệt; thẻ này chỉ minh họa trạng thái UI.</p>
    </AppShell>
  );
}
