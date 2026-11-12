"use client";

import { useState, type FormEvent } from "react";
import { AppShell, PageHeading } from "@/components/app-shell";
import type { AssignmentMode } from "@/lib/demo-data";

export default function NewTaskPage() {
  const [mode, setMode] = useState<AssignmentMode>("Direct");
  const [previewed, setPreviewed] = useState(false);
  const [deadlineUtc, setDeadlineUtc] = useState("");

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setDeadlineUtc(new Date(String(form.get("deadline"))).toISOString());
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
          <label className="field">Priority<select name="priority" defaultValue="Medium"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label>
          <label className="field">Số người cần<input name="requiredPeople" type="number" min="1" defaultValue="1" required /></label>
        </div>
        <div className="divider" />
        <div className="form-section-heading"><span className="step-number">2</span><div><h2>Hình thức nhận việc</h2><p>Role/Skill chuyên môn khác quyền Manager/Member và trách nhiệm RACI.</p></div></div>
        <div className="mode-options" role="radiogroup" aria-label="Hình thức nhận việc">
          {(["Direct", "Open Work"] as const).map((value) => (
            <label className={`mode-card ${mode === value ? "selected" : ""}`} key={value}>
              <input type="radio" name="assignmentMode" value={value} checked={mode === value} onChange={() => { setMode(value); setPreviewed(false); }} />
              <strong>{value === "Direct" ? "Direct Assignment" : "Open Work"}</strong>
              <span>{value === "Direct" ? "Gửi đề nghị cho Member trong team; họ có thể Accept hoặc Decline." : "Member đủ Role/Skill gửi request; Manager Approve hoặc Reject."}</span>
            </label>
          ))}
        </div>
        <div className="form-grid conditional-fields">
          {mode === "Direct" ? (
            <label className="field">Đề nghị cho Member<select name="assigneeUserId" required defaultValue=""><option value="" disabled>Chọn Member trong team</option><option value="member-1">Thành viên A</option><option value="member-2">Thành viên B</option></select></label>
          ) : (
            <>
              <label className="field">Role yêu cầu<select name="requiredRoleId" defaultValue=""><option value="">Không ràng buộc</option><option value="role-designer">Designer</option><option value="role-content">Content</option></select></label>
              <label className="field">Skill yêu cầu<select name="requiredSkillId" defaultValue=""><option value="">Không ràng buộc</option><option value="skill-figma">Figma</option><option value="skill-writing">Writing</option></select></label>
            </>
          )}
        </div>
        <details className="advanced-fields">
          <summary>Thêm mô tả, ước lượng và phụ thuộc</summary>
          <div className="form-grid conditional-fields">
            <label className="field field-wide">Mô tả và kết quả mong đợi<textarea name="description" rows={3} placeholder="Tiêu chí để A nghiệm thu" /></label>
            <label className="field">Loại hạn<select name="deadlineType" defaultValue="Flexible"><option>Flexible</option><option>Fixed</option></select></label>
            <label className="field">Effort estimate (giờ)<input name="estimate" type="number" min="0" step="0.5" placeholder="8" /></label>
            <label className="field">Milestone<input name="milestone" placeholder="Chọn milestone" /></label>
            <label className="field">Task tiền nhiệm<input name="dependency" placeholder="Finish-to-Start, cùng team" /></label>
          </div>
        </details>
        <div className="form-footer">
          <span>Giao diện nháp: form chưa gửi tới API và không lưu dữ liệu.</span>
          <button className="button button-primary" type="submit">Kiểm tra bản nháp</button>
        </div>
        {previewed && <p className="inline-notice" role="status">Form hợp lệ ở trình duyệt. Deadline UTC dự kiến gửi API: {deadlineUtc}. Đây chỉ là bản xem trước UI; chưa tạo task hoặc gửi đề nghị nhận việc.</p>}
      </form>
    </AppShell>
  );
}
