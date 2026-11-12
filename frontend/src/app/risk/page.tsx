import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getRiskSnapshot, listTasks, usingDemoData } from "@/lib/api/client";
import type { RiskSnapshot } from "@/lib/demo-data";

const fieldLabel: Record<string, string> = {
  deadlineAt: "Hạn hoàn thành",
  remainingHours: "Thời gian còn lại",
  progress: "Tiến độ",
  priority: "Độ ưu tiên",
  remainingHoursMinExclusive: "Ngưỡng thời gian dưới (không gồm)",
  remainingHoursMaxInclusive: "Ngưỡng thời gian trên (gồm)",
  progressMaxExclusive: "Ngưỡng tiến độ dưới (không gồm)",
};

const sourceLabel: Record<RiskSnapshot["evidence"][number]["source"], string> = {
  task: "Công việc",
  evaluation: "Lần đánh giá",
  rule: "Quy tắc",
  impact: "Điều kiện nâng mức",
};

const ruleExplanation: Record<RiskSnapshot["triggeredRules"][number], string> = {
  R01: "Đã quá deadline (thời gian còn lại < 0 giờ).",
  R02: "Còn 0–24 giờ và tiến độ dưới 80%.",
  R03: "Còn trên 24 đến 48 giờ và tiến độ dưới 50%.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatEvidenceValue(item: RiskSnapshot["evidence"][number]) {
  if (item.value === null) return "Không có";
  if (item.field === "deadlineAt" && typeof item.value === "string") return formatDate(item.value);
  if (item.unit === "hours") return `${item.value} giờ`;
  if (item.unit === "percent") return `${item.value}%`;
  return String(item.value);
}

export default async function RiskPage() {
  const tasks = await listTasks();
  const task = tasks.find((item) => item.riskLevel === "High" || item.riskLevel === "Medium");
  const snapshot = task ? await getRiskSnapshot(task.id) : undefined;
  if (!task || !snapshot) return <AppShell><PageHeading eyebrow="Manager / Risk evidence" title="Chưa có snapshot để xem" description="Khi Risk Engine đánh giá task, mức risk và evidence sẽ xuất hiện ở đây." /></AppShell>;

  const remaining = snapshot.evidence.find((item) => item.field === "remainingHours");
  const progress = snapshot.evidence.find((item) => item.field === "progress");
  const priority = snapshot.evidence.find((item) => item.field === "priority" && item.source === "impact");

  return (
    <AppShell>
      <PageHeading
        eyebrow="Manager / Risk evidence"
        title="Hiểu vì sao task cần can thiệp"
        description="Risk Engine tạo mức rủi ro từ dữ liệu task và lưu evidence. AI chỉ giải thích và gợi ý; Manager quyết định."
      />
      <div className="two-column-layout">
        <section className="panel">
          <div className="section-header">
            <div><p className="eyebrow">{task.id} · {task.team}</p><h2>{task.title}</h2></div>
            <StatusBadge value={snapshot.riskLevel} />
          </div>
          <p className="risk-summary">
            {remaining && progress
              ? `Tại thời điểm đánh giá: còn ${formatEvidenceValue(remaining)}, tiến độ ${formatEvidenceValue(progress)}.`
              : "Xem bằng chứng của lần đánh giá này."}
            {priority && snapshot.baseLevel !== snapshot.riskLevel
              ? ` Mức cơ sở ${snapshot.baseLevel} được nâng lên ${snapshot.riskLevel} do ưu tiên ${priority.value}.`
              : ""}
          </p>
          <div className="detail-grid">
            <div><span>Task Status</span><StatusBadge value={task.status} /></div>
            <div><span>Assignment Status</span>{task.assignmentStatus ? <StatusBadge value={task.assignmentStatus} /> : <strong>Không có lời mời</strong>}</div>
            <div><span>Mức cơ sở</span><StatusBadge value={snapshot.baseLevel} /></div>
            <div><span>Rule kích hoạt</span><strong>{snapshot.triggeredRules.join(", ") || "Không có"}</strong></div>
            <div><span>Đánh giá lúc (giờ Việt Nam)</span><strong>{formatDate(snapshot.evaluatedAt)}</strong></div>
            <div><span>Độ mới dữ liệu</span><strong>{snapshot.isCurrent === false ? "Snapshot đã cũ" : snapshot.isCurrent === true ? "Hiện tại" : "Chưa xác minh"}</strong></div>
          </div>
          <div className="rule-callout">
            <strong>Vì sao kích hoạt {snapshot.triggeredRules.join(", ") || "không có rule"}?</strong>
            {snapshot.triggeredRules.length ? snapshot.triggeredRules.map((rule) => (
              <span key={rule}>{rule}: {ruleExplanation[rule] ?? "Xem evidence và phiên bản rule để biết điều kiện kích hoạt."}</span>
            )) : <span>Đầu vào hợp lệ nhưng không thỏa điều kiện của R01–R03.</span>}
            {priority && snapshot.baseLevel !== snapshot.riskLevel && <span>Priority {priority.value} nâng mức cơ sở {snapshot.baseLevel} lên {snapshot.riskLevel}; priority không tự tạo risk.</span>}
          </div>
          <div className="divider" />
          <div className="section-header"><h3>Evidence của snapshot</h3><span className="count-label">{snapshot.evidence.length} mục · {snapshot.ruleVersion}</span></div>
          {snapshot.evidence.length ? (
            <div className="table-scroll">
              <table className="data-table evidence-table">
                <thead><tr><th>ID</th><th>Nguồn / Rule</th><th>Trường</th><th>Giá trị</th></tr></thead>
                <tbody>
                  {snapshot.evidence.map((item) => (
                    <tr key={item.id}>
                      <td><code>{item.id}</code></td>
                      <td>{sourceLabel[item.source]}{item.ruleId ? ` · ${item.ruleId}` : ""}</td>
                      <td>{fieldLabel[item.field] ?? item.field}</td>
                      <td><strong>{formatEvidenceValue(item)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="helper-note">Không có rule nào kích hoạt ở lần đánh giá này.</p>}
          <div className="rule-callout">
            <strong>Ngữ cảnh cần phân biệt</strong>
            <span>Blocker đang mở làm task ở trạng thái Blocked. Trong POC R01–R03, blocker chưa tự kích hoạt rule risk theo thời lượng. Muốn gửi Review phải giải quyết blocker trước.</span>
          </div>
          {snapshot.evaluationError && <p className="warning-line">Lần đánh giá mới gặp lỗi: {snapshot.evaluationError.message ?? snapshot.evaluationError.code}. Evidence của snapshot trước vẫn xem được.</p>}
          <p className="meta-line">{usingDemoData ? "Dữ liệu trên là ví dụ theo fixture CWRM-15 và bản OpenAPI CWRM-11 0.2.0-draft; chưa phải kết quả đánh giá trực tiếp." : "Độ mới snapshot lấy từ isCurrent của API; UI không tự tính fingerprint."}</p>
        </section>
        <section className="panel ai-panel">
          <p className="eyebrow">Advisory only</p>
          <h2>Cố vấn AI</h2>
          <p>AI chỉ giải thích snapshot; Manager kiểm tra evidence gốc trước khi chọn cách xử lý. Gợi ý của snapshot cũ phải được đánh dấu hết hiệu lực.</p>
          {usingDemoData && (
            <div className="ai-placeholder">
              <strong>Ví dụ hiển thị · chưa phải phản hồi AI thật</strong>
              <span>Tóm tắt: R03 kích hoạt vì còn 40 giờ đến hạn và progress 30%; priority HIGH nâng Medium lên High.</span>
              <span>Evidence liên kết: ev-02, ev-03, ev-04, ev-05, ev-06, ev-07.</span>
              <span>Phương án 1 — Tháo blocker. Lý do: khôi phục khả năng hoàn thành poster. Lưu ý: cần xác nhận nguồn lực và thời gian thực tế.</span>
              <span>Phương án 2 — Điều chỉnh hạn. Lý do: tạo thêm thời gian xử lý. Lưu ý: có thể ảnh hưởng task Chạy quảng cáo phụ thuộc poster.</span>
            </div>
          )}
          <div className="rule-callout">
            <strong>Khi AI lỗi</strong>
            <span>Risk và evidence vẫn hiển thị. Hiện details.fallbackExplanation nếu API trả về; chỉ cho Thử lại khi retryable=true.</span>
          </div>
          <button className="button button-primary" disabled title="Chưa kết nối API">Yêu cầu giải thích</button>
          <button className="button button-secondary" disabled title="Chỉ mở khi lỗi cho phép thử lại">Thử lại</button>
          <p className="helper-note">Hành động xử lý cần kiểm tra quyền Manager, ghi lý do và audit, sau đó đánh giá lại risk. Kết quả không mặc định trở về Low.</p>
        </section>
      </div>
    </AppShell>
  );
}
