import Link from "next/link";
import { AppShell } from "@/components/app-shell";

const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

export default function NotFound() {
  return (
    <AppShell>
      <div style={{ maxWidth: 620, margin: "40px auto 0", textAlign: "center" }}>
        <p className="eyebrow">Lỗi điều hướng</p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 12,
            padding: "13px 22px",
            borderRadius: 10,
            border: "1px dashed var(--border-strong)",
            background: "var(--card-soft)",
            color: "var(--code-text)",
            fontFamily: monoFont,
            fontSize: "clamp(22px, 3.4vw, 30px)",
            fontWeight: 750,
            letterSpacing: ".08em",
          }}
        >
          404 <span style={{ color: "var(--faint)" }}>-</span> NOT_FOUND
        </div>
        <h1 style={{ fontSize: "clamp(24px, 2.4vw, 30px)", marginTop: 22 }}>Không tìm thấy trang này</h1>
        <p className="page-description" style={{ margin: "10px auto 0" }}>
          Đường dẫn không hợp lệ, công việc không tồn tại hoặc bạn không có quyền truy cập trong workspace hiện tại.
        </p>
        <div className="button-row" style={{ justifyContent: "center", marginTop: 28 }}>
          <Link className="button button-primary" href="/tasks">Về danh sách công việc</Link>
          <Link className="button button-secondary" href="/my-work">Về việc của tôi</Link>
        </div>
        <p className="helper-note" style={{ textAlign: "center", marginTop: 20 }}>
          Mã <span style={{ fontFamily: monoFont }}>404 - NOT_FOUND</span> thường xuất hiện khi ID công việc không tồn tại hoặc đã thay đổi.
        </p>
      </div>
    </AppShell>
  );
}
