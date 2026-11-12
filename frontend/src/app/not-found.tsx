import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <PageHeading
        eyebrow="404 · Không tìm thấy"
        title="Không tìm thấy trang hoặc công việc này"
        description="Đường dẫn không hợp lệ, công việc không tồn tại hoặc bạn không có quyền truy cập trong workspace hiện tại."
        action={<Link className="button button-primary" href="/tasks">Về danh sách công việc</Link>}
      />
      <section className="panel" style={{ maxWidth: 640, margin: "24px auto", textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <h2 style={{ marginBottom: 8 }}>Không tìm thấy dữ liệu yêu cầu</h2>
        <p style={{ color: "var(--text-muted, #64748b)", marginBottom: 24, lineHeight: 1.6 }}>
          Mã công việc bạn truy cập không có trong hệ thống hoặc đường dẫn đã thay đổi. Vui lòng kiểm tra lại ID công việc hoặc quay về trang điều phối.
        </p>
        <div className="button-row" style={{ justifyContent: "center" }}>
          <Link className="button button-primary" href="/tasks">Xem danh sách công việc</Link>
          <Link className="button button-secondary" href="/manager">Về bảng điều phối Manager</Link>
        </div>
      </section>
    </AppShell>
  );
}
