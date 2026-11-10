import { AppShell, PageHeading } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import {
  demoCurrentInputFingerprint,
  demoRiskSnapshot,
  demoTasks,
  type RiskSnapshot,
} from "@/lib/demo-data";

const fieldLabel: Record<string, string> = {
  deadline: "Hạn hoàn thành",
  remainingHours: "Thời gian còn lại",
  progress: "Tiến độ",
  priority: "Độ ưu tiên",
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
  if (item.field === "deadline" && typeof item.value === "string") return formatDate(item.value);
  if (item.unit === "hours") return `${item.value} giờ`;
  if (item.unit === "percent") return `${item.value}%`;
  return String(item.value);
}

export default function RiskPage() {
  const snapshot = demoRiskSnapshot;
  const task = demoTasks.find((item) => item.id === snapshot.taskId);
  if (!task) return null;

  const current = demoCurrentInputFingerprint === snapshot.inputFingerprint;
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
              ? `Còn ${formatEvidenceValue(remaining)}, tiến độ ${formatEvidenceValue(progress)}.`
              : "Xem bằng chứng của lần đánh giá này."}
            {priority && snapshot.baseLevel !== snapshot.riskLevel
              ? ` Mức cơ sở ${snapshot.baseLevel} được nâng lên ${snapshot.riskLevel} do ưu tiên ${priority.value}.`
              : ""}
          </p>
          <div className="detail-grid">
            <div><span>Task Status</span><StatusBadge value={task.status} /></div>
            <div><span>Assignment Status</span><StatusBadge value={task.assignmentStatus ?? "Pending Acceptance"} /></div>
            <div><span>Mức cơ sở</span><StatusBadge value={snapshot.baseLevel} /></div>
            <div><span>Rule kích hoạt</span><strong>{snapshot.triggeredRules.join(", ") || "Không có"}</strong></div>
            <div><span>Đánh giá lúc</span><strong>{formatDate(snapshot.evaluatedAt)}</strong></div>
            <div><span>Độ mới dữ liệu</span><strong>{current ? "Khớp input mẫu" : "Snapshot đã cũ"}</strong></div>
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
                      <td>{item.source}{item.ruleId ? ` · ${item.ruleId}` : ""}</td>
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
          <p className="meta-line">Schema CWRM-15 là bản ứng viên, đang chờ CWRM-11 chốt API. Fingerprint trên trang này chỉ là dữ liệu mock, không phải hash thực.</p>
        </section>
        <section className="panel ai-panel">
          <p className="eyebrow">Advisory only</p>
          <h2>Cố vấn AI</h2>
          <p>Ở bản hoàn chỉnh, Manager có thể yêu cầu AI giải thích snapshot này bằng các evidence ID và nhận 2–3 phương án. Nếu task đổi, gợi ý gắn với fingerprint cũ phải được đánh dấu hết hiệu lực.</p>
          <div className="ai-placeholder">
            <strong>Chưa kết nối AI API</strong>
            <span>Khi API lỗi, risk level và evidence vẫn xem được; Manager có thể thử lại sau.</span>
          </div>
          <button className="button button-primary" disabled title="Chưa kết nối API">Yêu cầu giải thích</button>
          <p className="helper-note">Hành động xử lý cần kiểm tra quyền Manager, ghi lý do và audit, sau đó đánh giá lại risk. Kết quả không mặc định trở về Low.</p>
        </section>
      </div>
    </AppShell>
  );
}
