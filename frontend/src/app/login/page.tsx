import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-theme-toggle"><ThemeToggle /></div>
      <div className="login-intro">
        <span className="login-mark">C</span>
        <p className="eyebrow">CWRM Platform</p>
        <h1>Công việc rõ người, rủi ro rõ bằng chứng.</h1>
        <p>Điều phối nhóm, theo dõi tiến độ và nhận gợi ý xử lý dựa trên dữ liệu thực của công việc.</p>
      </div>
      <section className="login-card" aria-labelledby="login-title">
        <h2 id="login-title">Đăng nhập</h2>
        <p>Giao diện minh họa. Chức năng xác thực sẽ được tích hợp với backend.</p>
        <label className="field">Email<input type="email" placeholder="ban@nhom.vn" disabled /></label>
        <label className="field">Mật khẩu<input type="password" placeholder="••••••••" disabled /></label>
        <button className="button button-primary" disabled>Đăng nhập</button>
        <Link href="/manager" className="text-link">Xem bản UI demo →</Link>
      </section>
    </main>
  );
}
