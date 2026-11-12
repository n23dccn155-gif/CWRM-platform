import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { demoMemberProfile, missingOpenWorkRequirements } from "@/lib/demo-data";
import { listTasks } from "@/lib/api/client";

const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

function CapacitySlots({
  reserved,
  required,
  remaining,
}: {
  reserved: number;
  required: number;
  remaining: number;
}) {
  const slots = Array.from({ length: required }, (_, index) => index);
  return (
    <span className="capacity-slots" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span
        role="img"
        aria-label={`${reserved}/${required} chỗ đã giữ`}
        style={{ display: "inline-flex", alignItems: "center", gap: 3 }}
      >
        {slots.map((slot) => (
          <span
            key={slot}
            style={
              slot < reserved
                ? { width: 15, height: 6, borderRadius: 3, background: "var(--success-text)" }
                : { width: 15, height: 6, borderRadius: 3, border: "1px dashed var(--border-strong)", background: "transparent" }
            }
          />
        ))}
      </span>
      <span
        className="count-label"
        style={{
          fontFamily: monoFont,
          fontSize: 11,
          letterSpacing: ".02em",
          color: remaining > 0 ? "var(--success-text)" : "var(--muted)",
        }}
      >
        Còn {remaining}/{required} chỗ
      </span>
    </span>
  );
}

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
              <CapacitySlots reserved={item.reserved} required={item.required} remaining={item.remainingSlots} />
            </div>
            <h2>{item.title}</h2>
            {item.requestStatus && (
              <div className="badge-row" style={{ margin: "-4px 0 12px" }}>
                <StatusBadge kind="requestStatus" value={item.requestStatus} />
                <span className="count-label">Request của bạn đang ở trạng thái này</span>
              </div>
            )}
            <div className="requirement-row"><span>Role: <strong>{item.requiredRole}</strong></span><span>Skill: <strong>{item.requiredSkills?.join(", ")}</strong></span></div>
            {item.missingRequirements.length === 0 ? (
              <div className="eligibility success">
                <strong>Đủ điều kiện</strong>
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
                <button
                  className="button button-secondary"
                  style={{ background: "transparent" }}
                  disabled
                  title="Member có quyền rút request Pending; trạng thái chuyển Withdrawn (chờ API)"
                >
                  Rút request (Withdrawn)
                </button>
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
