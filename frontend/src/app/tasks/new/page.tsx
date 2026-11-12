"use client";

import { useState, type FormEvent } from "react";
import { AppShell, PageHeading } from "@/components/app-shell";

export default function NewTaskPage() {
  const [mode, setMode] = useState<"DIRECT" | "OPEN_WORK">("DIRECT");
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
      priority: String(form.get("priority") ?? "MEDIUM"),
      requiredPeople: Number(form.get("requiredPeople") ?? 1),
      assignmentMode: mode,
      openWorkOpen: false,
      requiredRoleIds: mode === "OPEN_WORK" && form.get("requiredRoleId") ? [String(form.get("requiredRoleId"))] : [],
      requiredSkillIds: mode === "OPEN_WORK" && form.get("requiredSkillId") ? [String(form.get("requiredSkillId"))] : [],
      deadlineType: String(form.get("deadlineType") ?? "FLEXIBLE"),
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
      <form className="panel task-form" onSubmit={handlePreview}>
        <div className="form-section-heading"><span className="step-number">1</span><div><h2>Thông tin cốt lõi</h2><p>Task mới bắt đầu ở To Do, progress 0 và có đúng một A.</p></div></div>
        <div className="form-grid">
          <label className="field field-wide">Tiêu đề công việc<input name="title" required placeholder="Ví dụ: Hoàn thiện bản thiết kế" /></label>
          <label className="field">Team<select name="teamId" required defaultValue=""><option value="" disabled>Chọn team</option><option value="team-a">Nhóm A</option><option value="team-b">Nhóm B</option></select></label>
          <label className="field">A chịu trách nhiệm<select name="accountableUserId" required defaultValue=""><option value="" disabled>Chọn một Manager trong team</option><option value="manager-1">Quản lý nhóm</option></select></label>
          <label className="field">Deadline<input name="deadline" type="datetime-local" required /></label>
          <label className="field">
            Priority
            <select name="priority" defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
          <label className="field">Số người cần (requiredPeople)<input name="requiredPeople" type="number" min="1" defaultValue="1" required /></label>
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
              <span>{desc}</span>
            </label>
          ))}
        </div>
        <div className="form-grid conditional-fields">
          {mode === "DIRECT" ? (
            <label className="field">Đề nghị cho Member<select name="assigneeUserId" required defaultValue=""><option value="" disabled>Chọn Member trong team</option><option value="member-1">Thành viên A</option><option value="member-2">Thành viên B</option></select></label>
          ) : (
            <>
              <label className="field">Role yêu cầu<select name="requiredRoleId" defaultValue=""><option value="">Không ràng buộc</option><option value="role-designer">Designer</option><option value="role-content">Content</option></select></label>
              <label className="field">Skill yêu cầu<select name="requiredSkillId" defaultValue=""><option value="">Không ràng buộc</option><option value="skill-figma">Figma</option><option value="skill-writing">Writing</option></select></label>
            </>
          )}
        </div>
        <details className="advanced-fields">
          <summary>Thêm mô tả và ước lượng</summary>
          <div className="form-grid conditional-fields">
            <label className="field field-wide">Mô tả và kết quả mong đợi<textarea name="description" rows={3} placeholder="Tiêu chí để A nghiệm thu" /></label>
            <label className="field">
              Loại hạn (deadlineType)
              <select name="deadlineType" defaultValue="FLEXIBLE">
                <option value="FLEXIBLE">Flexible</option>
                <option value="FIXED">Fixed</option>
              </select>
            </label>
            <label className="field">Effort estimate (giờ)<input name="estimate" type="number" min="0" step="0.5" placeholder="8" /></label>
          </div>
        </details>
        <p className="helper-note">Sau khi tạo task, Manager gửi đề nghị Direct hoặc mở Open Work qua thao tác riêng. Milestone và task tiền nhiệm cũng cần dữ liệu thật để chọn; bản nháp này chưa thực hiện các bước đó.</p>
        <div className="form-footer">
          <span>Giao diện nháp: form chưa gửi tới API và không lưu dữ liệu.</span>
          <button className="button button-primary" type="submit">Kiểm tra bản nháp</button>
        </div>
        {previewed && payloadPreview && (
          <div className="inline-notice" role="status">
            <p><strong>Form hợp lệ ở trình duyệt.</strong> Dữ liệu dự kiến gửi để tạo task theo bản nháp CWRM-11:</p>
            <pre style={{ margin: "8px 0 0", padding: "8px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", fontSize: "12px", overflowX: "auto" }}>
              {JSON.stringify(payloadPreview, null, 2)}
            </pre>
            <p style={{ marginTop: "6px", fontSize: "12px" }}>ID trong lựa chọn hiện là dữ liệu mẫu, chưa phải UUID hợp lệ. {mode === "DIRECT" ? `Người dự kiến mời: ${directInvitee}. ` : ""}Lời mời Direct dùng API riêng sau khi tạo task. Bản xem trước chưa lưu dữ liệu.</p>
          </div>
        )}
      </form>
    </AppShell>
  );
}
