"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { AppShell, PageHeading } from "@/components/app-shell";

const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

const priorityOptions = [
  { code: "LOW", label: "Thấp" },
  { code: "MEDIUM", label: "Trung bình" },
  { code: "HIGH", label: "Cao" },
  { code: "CRITICAL", label: "Khẩn cấp" },
] as const;

const deadlineTypeOptions = [
  { code: "FLEXIBLE", label: "Linh hoạt" },
  { code: "FIXED", label: "Cố định" },
] as const;

const payloadPreStyle: CSSProperties = {
  margin: 0,
  padding: "16px 18px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--card-soft)",
  color: "var(--code-text)",
  fontFamily: monoFont,
  fontSize: 12,
  lineHeight: 1.7,
  letterSpacing: ".01em",
  overflowX: "auto",
  maxHeight: 470,
  whiteSpace: "pre",
};

function radioChipStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 13px",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--accent-border)" : "var(--input-border)"}`,
    background: active ? "var(--accent-soft)" : "var(--input-bg)",
    color: active ? "var(--accent-soft-text)" : "var(--text)",
    fontSize: 12,
    fontWeight: 750,
    cursor: "pointer",
  };
}

export default function NewTaskPage() {
  const [mode, setMode] = useState<"DIRECT" | "OPEN_WORK">("DIRECT");
  const [priority, setPriority] = useState<(typeof priorityOptions)[number]["code"]>("MEDIUM");
  const [deadlineType, setDeadlineType] = useState<(typeof deadlineTypeOptions)[number]["code"]>("FLEXIBLE");
  const [previewed, setPreviewed] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<Record<string, unknown> | null>(null);
  const [directInvitee, setDirectInvitee] = useState("");

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const deadlineVal = String(form.get("deadline"));
    const deadlineUtc = deadlineVal ? new Date(deadlineVal).toISOString() : "";
    const payload = {
      title: String(form.get("title") ?? ""),
      teamId: String(form.get("teamId") ?? ""),
      accountableUserId: String(form.get("accountableUserId") ?? ""),
      deadlineAt: deadlineUtc,
      priority,
      requiredPeople: Number(form.get("requiredPeople") ?? 1),
      assignmentMode: mode,
      openWorkOpen: false,
      requiredRoleIds: mode === "OPEN_WORK" && form.get("requiredRoleId") ? [String(form.get("requiredRoleId"))] : [],
      requiredSkillIds: mode === "OPEN_WORK" && form.get("requiredSkillId") ? [String(form.get("requiredSkillId"))] : [],
      deadlineType,
      description: form.get("description") ? String(form.get("description")) : undefined,
      effortEstimateHours: form.get("estimate") ? Number(form.get("estimate")) : undefined,
    };
    setPayloadPreview(payload);
    setDirectInvitee(mode === "DIRECT" ? String(form.get("assigneeUserId") ?? "") : "");
    setPreviewed(true);
  }

  return (
    <AppShell>
      <PageHeading
        eyebrow="Manager / Tạo công việc"
        title="Giao việc rõ ràng từ đầu"
        description="Manager chọn đúng một A và một hình thức nhận việc. Direct tạo R sau Accepted; Open Work tạo R sau khi Manager duyệt request."
      />
      <div className="two-column-layout">
        <form className="panel task-form" onSubmit={handlePreview}>
          <div className="form-section-heading"><span className="step-number">1</span><div><h2>Thông tin cốt lõi</h2><p>Task mới bắt đầu ở To Do, progress 0 và có đúng một A.</p></div></div>
          <div className="form-grid">
            <label className="field field-wide">Tiêu đề công việc<input name="title" required placeholder="Ví dụ: Hoàn thiện bản thiết kế" /></label>
            <label className="field">Team<select name="teamId" required defaultValue=""><option value="" disabled>Chọn team</option><option value="team-a">Nhóm A · team-a</option><option value="team-b">Nhóm B · team-b</option></select></label>
            <label className="field">A chịu trách nhiệm<select name="accountableUserId" required defaultValue=""><option value="" disabled>Chọn một Manager trong team</option><option value="manager-1">Quản lý nhóm · manager-1</option></select></label>
            <label className="field">Deadline<input name="deadline" type="datetime-local" required /></label>
            <div className="field">
              <span>Loại hạn (deadlineType)</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }} role="radiogroup" aria-label="Loại hạn">
                {deadlineTypeOptions.map((option) => {
                  const active = deadlineType === option.code;
                  return (
                    <label key={option.code} style={radioChipStyle(active)}>
                      <input
                        type="radio"
                        name="deadlineType"
                        value={option.code}
                        checked={active}
                        onChange={() => {
                          setDeadlineType(option.code);
                          setPreviewed(false);
                        }}
                        style={{ accentColor: "var(--accent)", margin: 0 }}
                      />
                      <span style={{ fontFamily: monoFont, fontSize: 11, letterSpacing: ".04em" }}>{option.code}</span>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <label className="field">Số người cần (requiredPeople)<input name="requiredPeople" type="number" min="1" defaultValue="1" required /></label>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Priority — mã enum API</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="radiogroup" aria-label="Priority">
                {priorityOptions.map((option) => {
                  const active = priority === option.code;
                  return (
                    <label key={option.code} style={radioChipStyle(active)}>
                      <input
                        type="radio"
                        name="priority"
                        value={option.code}
                        checked={active}
                        onChange={() => {
                          setPriority(option.code);
                          setPreviewed(false);
                        }}
                        style={{ accentColor: "var(--accent)", margin: 0 }}
                      />
                      <span style={{ fontFamily: monoFont, fontSize: 11, letterSpacing: ".04em" }}>{option.code}</span>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="divider" />
          <div className="form-section-heading"><span className="step-number">2</span><div><h2>Hình thức nhận việc</h2><p>Role/Skill chuyên môn khác quyền Manager/Member và trách nhiệm RACI.</p></div></div>
          <div className="mode-options" role="radiogroup" aria-label="Hình thức nhận việc">
            {([
              { code: "DIRECT" as const, label: "Direct Assignment", desc: "Gửi đề nghị cho Member trong team; họ có thể Accept hoặc Decline." },
              { code: "OPEN_WORK" as const, label: "Open Work", desc: "Member đủ Role/Skill gửi request; Manager Approve hoặc Reject." },
            ]).map(({ code, label, desc }) => (
              <label className={`mode-card ${mode === code ? "selected" : ""}`} key={code}>
                <input type="radio" name="assignmentMode" value={code} checked={mode === code} onChange={() => { setMode(code); setPreviewed(false); }} />
                <strong>{label}</strong>
                <span style={{ fontFamily: monoFont, fontSize: 11, letterSpacing: ".06em" }}>{code}</span>
                <span>{desc}</span>
              </label>
            ))}
          </div>
          <div className="form-grid conditional-fields">
            {mode === "DIRECT" ? (
              <label className="field">Đề nghị cho Member<select name="assigneeUserId" required defaultValue=""><option value="" disabled>Chọn Member trong team</option><option value="member-1">Thành viên A · member-1</option><option value="member-2">Thành viên B · member-2</option></select></label>
            ) : (
              <>
                <label className="field">Role yêu cầu<select name="requiredRoleId" defaultValue=""><option value="">Không ràng buộc</option><option value="role-designer">Designer · role-designer</option><option value="role-content">Content · role-content</option></select></label>
                <label className="field">Skill yêu cầu<select name="requiredSkillId" defaultValue=""><option value="">Không ràng buộc</option><option value="skill-figma">Figma · skill-figma</option><option value="skill-writing">Writing · skill-writing</option></select></label>
              </>
            )}
          </div>
          <details className="advanced-fields">
            <summary>Thêm mô tả và ước lượng</summary>
            <div className="form-grid conditional-fields">
              <label className="field field-wide">Mô tả và kết quả mong đợi<textarea name="description" rows={3} placeholder="Tiêu chí để A nghiệm thu" /></label>
              <label className="field">Effort estimate (giờ)<input name="estimate" type="number" min="0" step="0.5" placeholder="8" /></label>
            </div>
          </details>
          <p className="helper-note">Sau khi tạo task, Manager gửi đề nghị Direct hoặc mở Open Work qua thao tác riêng. Milestone và task tiền nhiệm cũng cần dữ liệu thật để chọn; bản nháp này chưa thực hiện các bước đó.</p>
          <div className="form-footer">
            <span>Giao diện nháp: form chưa gửi tới API và không lưu dữ liệu.</span>
            <button className="button button-primary" type="submit">Kiểm tra bản nháp</button>
          </div>
        </form>

        <aside className="panel" style={{ position: "sticky", top: 16, alignSelf: "start" }} aria-label="Xem trước JSON payload">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <div>
              <p className="eyebrow">API preview</p>
              <h2>JSON payload</h2>
            </div>
            <span className={`status-badge ${previewed ? "status-success" : "status-neutral"}`}>
              {previewed ? "Payload hợp lệ" : "Chưa kiểm tra"}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: monoFont, fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "var(--faint)" }}>
              POST /tasks
            </span>
            <span style={{ fontFamily: monoFont, fontSize: 11, color: "var(--faint)" }}>
              content-type: application/json
            </span>
          </div>
          <pre style={payloadPreStyle}>
            {previewed && payloadPreview
              ? JSON.stringify(payloadPreview, null, 2)
              : '// Nhập thông tin task ở cột trái\n// rồi nhấn "Kiểm tra bản nháp"\n// để xem JSON payload gửi tới POST /tasks'}
          </pre>
          <p className="helper-note">
            ID trong lựa chọn hiện là dữ liệu mẫu, chưa phải UUID hợp lệ.
            {mode === "DIRECT" && directInvitee ? ` Người dự kiến mời: ${directInvitee}.` : ""}
            {" "}Lời mời Direct dùng API riêng sau khi tạo task. Bản xem trước chưa lưu dữ liệu.
          </p>
        </aside>
      </div>
    </AppShell>
  );
}
