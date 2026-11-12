"use client";

import { useState } from "react";
import type { RiskSnapshot, TaskSummary } from "@/lib/demo-data";

interface RiskAdvisorPanelProps {
  task: TaskSummary;
  snapshot: RiskSnapshot;
}

export function RiskAdvisorPanel({ task, snapshot }: RiskAdvisorPanelProps) {
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [simulateError, setSimulateError] = useState(false);
  const [selectedAction, setSelectedAction] = useState<number | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionApplied, setDecisionApplied] = useState(false);

  const fallbackExplanation =
    "CĂN CỨ DỰ PHÒNG TỪ RULE ENGINE (CWRM-15/16 POC): Task đang kích hoạt rule R03 do còn 40 giờ (< 48h) và tiến độ chỉ đạt 30% (< 50%). Ngoài ra task có độ ưu tiên High và blocker chưa giải quyết. Khuyến nghị Manager tháo gỡ blocker kỹ thuật trước để cho phép thành viên tiếp tục luồng thực thi.";

  function runDiagnosis() {
    setLoading(true);
    setDecisionApplied(false);
    setTimeout(() => {
      setLoading(false);
      setAnalyzed(true);
    }, 700);
  }

  function handleApplyAction(index: number) {
    if (!decisionReason.trim()) {
      alert("Vui lòng nhập lý do can thiệp của Manager trước khi áp dụng.");
      return;
    }
    setSelectedAction(index);
    setDecisionApplied(true);
  }

  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="section-header">
        <div>
          <p className="eyebrow">AI Advisor · Human-in-the-Loop</p>
          <h2>Cố vấn rủi ro AI & Đề xuất phương án can thiệp</h2>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={simulateError}
              onChange={(e) => {
                setSimulateError(e.target.checked);
                setDecisionApplied(false);
              }}
              style={{ accentColor: "var(--danger)" }}
            />
            Mô phỏng lỗi API 503 / Fallback
          </label>
          <button
            onClick={runDiagnosis}
            disabled={loading}
            className="button button-primary"
            style={{ minHeight: 34, padding: "0 14px", fontSize: 12 }}
          >
            {loading ? "Đang phân tích..." : analyzed ? "Chẩn đoán lại với AI" : "Yêu cầu AI chẩn đoán"}
          </button>
        </div>
      </div>

      <p className="section-intro">
        Mô hình AI đối chiếu dữ liệu snapshot và trích dẫn mã evidence (Human-in-the-Loop). Manager là người quyết định cuối cùng và chịu trách nhiệm ghi nhận lý do.
      </p>

      {loading && (
        <div style={{ padding: "28px 16px", textAlign: "center", background: "var(--card-soft)", borderRadius: 8, border: "1px dashed var(--border)" }}>
          <div style={{ display: "inline-block", width: 22, height: 22, border: "2.5px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-2)" }}>Đang đối chiếu {snapshot.evidence.length} bằng chứng với các quy tắc R01–R03...</p>
        </div>
      )}

      {!loading && !analyzed && !simulateError && (
        <div style={{ padding: "20px", background: "var(--card-soft)", borderRadius: 8, border: "1px solid var(--border)", textAlign: "center" }}>
          <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13 }}>
            Chưa khởi chạy chẩn đoán AI cho {task.id}. Nhấn nút <strong>Yêu cầu AI chẩn đoán</strong> để phân tích nguyên nhân gốc và xem 3 phương án can thiệp.
          </p>
          <button onClick={runDiagnosis} className="button button-primary">Yêu cầu AI chẩn đoán ngay</button>
        </div>
      )}

      {!loading && simulateError && (
        <div style={{ padding: 16, background: "var(--danger-soft-2)", border: "1px solid var(--danger-border)", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--danger)" }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>⚠️ LỖI KẾT NỐI AI ADVISOR (503 SERVICE UNAVAILABLE)</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--danger)", margin: "0 0 10px", lineHeight: 1.5 }}>
            Không thể gọi Gemini API hoặc dịch vụ AI phản hồi chậm. Hệ thống tự động chuyển sang chế độ <strong>Fallback kỹ thuật</strong> theo đặc tả CWRM-16 POC.
          </p>
          <div style={{ padding: 12, background: "var(--card)", borderRadius: 6, border: "1px solid var(--border)" }}>
            <strong style={{ display: "block", fontSize: 12, marginBottom: 4, color: "var(--text)" }}>Bản ghi giải thích dự phòng (fallbackExplanation):</strong>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>{fallbackExplanation}</p>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={() => setSimulateError(false)} className="button button-secondary" style={{ fontSize: 12 }}>Tắt mô phỏng lỗi</button>
            <button onClick={runDiagnosis} className="button button-primary" style={{ fontSize: 12 }}>Thử lại kết nối</button>
          </div>
        </div>
      )}

      {!loading && analyzed && !simulateError && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* AI Diagnostic Summary Card */}
          <div style={{ padding: 16, background: "var(--card-soft)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--accent-text)" }}>
                ✨ NHẬN ĐỊNH CỦA AI ADVISOR
              </span>
              <span className="count-label">Mô hình: Gemini 2.0 Flash POC</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text)", margin: "0 0 10px" }}>
              Task <strong className="td-code">{task.id}</strong> đang rơi vào trạng thái rủi ro{" "}
              <strong style={{ color: "var(--danger)" }}>HIGH</strong> do kích hoạt quy tắc{" "}
              <code className="td-code">R03</code>: Căn cứ bằng chứng <code className="td-code">[ev-02]</code> (thời gian còn lại 40 giờ) và{" "}
              <code className="td-code">[ev-03]</code> (tiến độ thực tế chỉ đạt 30%, thấp hơn ngưỡng an toàn 50%). Độ ưu tiên{" "}
              <code className="td-code">[ev-05]</code> (Priority High) đã nâng mức đánh giá cơ sở từ Medium lên High. Đồng thời, task đang có{" "}
              <strong style={{ color: "var(--danger)" }}>1 blocker kỹ thuật mở</strong> khiến thành viên thực hiện (R) không thể hoàn thành để gửi Review.
            </p>
          </div>

          {/* Intervention Options */}
          <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            <div className="flow-stage-card" style={{ borderTop: "3px solid var(--danger)" }}>
              <span>Phương án 1 · Khuyến nghị số 1</span>
              <strong>Tháo gỡ Blocker kỹ thuật</strong>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text-2)" }}>Căn cứ [ev-02, ev-03]:</strong> Tiến độ 30% bị chặn bởi blocker tài nguyên. Tháo gỡ blocker là điều kiện tiên quyết để task tiếp tục chạy và cho phép nộp Review.
              </p>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text-2)" }}>Tác động:</strong> Đưa task trở lại luồng In Progress bình thường mà không cần dời lịch của các task phụ thuộc.
              </p>
              <button
                onClick={() => setSelectedAction(1)}
                className={`button ${selectedAction === 1 ? "button-primary" : "button-secondary"}`}
                style={{ marginTop: "auto", fontSize: 12 }}
              >
                {selectedAction === 1 ? "✓ Đã chọn phương án này" : "Chọn phương án 1"}
              </button>
            </div>

            <div className="flow-stage-card" style={{ borderTop: "3px solid var(--warm)" }}>
              <span>Phương án 2 · Điều chỉnh tiến độ</span>
              <strong>Gia hạn Deadline thêm 24–48h</strong>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text-2)" }}>Căn cứ [ev-04]:</strong> Ngưỡng R03 còn hiệu lực. Gia hạn giúp giảm áp lực thời gian còn lại ({task.deadlineLabel}).
              </p>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text-2)" }}>Tác động:</strong> Task phụ thuộc (Chạy quảng cáo) sẽ phải dời theo; yêu cầu ghi nhận audit và thông báo cho các bên RACI.
              </p>
              <button
                onClick={() => setSelectedAction(2)}
                className={`button ${selectedAction === 2 ? "button-primary" : "button-secondary"}`}
                style={{ marginTop: "auto", fontSize: 12 }}
              >
                {selectedAction === 2 ? "✓ Đã chọn phương án này" : "Chọn phương án 2"}
              </button>
            </div>

            <div className="flow-stage-card" style={{ borderTop: "3px solid var(--info-text)" }}>
              <span>Phương án 3 · Bổ sung nguồn lực</span>
              <strong>Tăng cường nhân sự hỗ trợ</strong>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text-2)" }}>Căn cứ [ev-01]:</strong> Chỉ có 1 người thực hiện R ({task.responsible ?? "Chưa có"}). Cần thêm người phụ tá để đẩy nhanh tiến độ vượt qua ngưỡng 50%.
              </p>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text-2)" }}>Tác động:</strong> Giữ nguyên deadline chiến dịch, giảm nguy cơ trễ hạn mà không ảnh hưởng tới tiến độ chung.
              </p>
              <button
                onClick={() => setSelectedAction(3)}
                className={`button ${selectedAction === 3 ? "button-primary" : "button-secondary"}`}
                style={{ marginTop: "auto", fontSize: 12 }}
              >
                {selectedAction === 3 ? "✓ Đã chọn phương án này" : "Chọn phương án 3"}
              </button>
            </div>
          </div>

          {/* Decision & Audit input */}
          <div style={{ padding: 16, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}>
            <h3 style={{ fontSize: 13, marginBottom: 8 }}>Quyết định của Manager & Nhật ký can thiệp (Audit Record)</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <label className="field" style={{ gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Lý do can thiệp (bắt buộc theo quy chuẩn Human-in-the-Loop):</span>
                <input
                  type="text"
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Nhập căn cứ nghiệp vụ của Manager (VD: Đã duyệt giải phóng blocker kỹ thuật và yêu cầu R đẩy tiến độ trước 18:00)..."
                />
              </label>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={() => handleApplyAction(selectedAction ?? 1)}
                  disabled={selectedAction === null || decisionApplied}
                  className="button button-primary"
                  style={{ fontSize: 12 }}
                >
                  {decisionApplied ? "✓ Đã ghi nhận quyết định can thiệp" : "Áp dụng phương án & Đánh giá lại Risk"}
                </button>
                {decisionApplied && (
                  <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 600 }}>
                    Đã ghi nhận audit: Phương án {selectedAction} kèm lý do. Hệ thống sẽ kích hoạt đánh giá lại Risk khi kết nối backend!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
