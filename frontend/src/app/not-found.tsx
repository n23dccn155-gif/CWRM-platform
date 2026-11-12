import Link from "next/link";
import { AppShell, PageHeading } from "@/components/app-shell";

export default function NotFound() {
  return (
    <AppShell>
      <PageHeading eyebrow="Không tìm thấy" title="Không có trang hoặc công việc này" description="Đường dẫn có thể đã đổi hoặc công việc không thuộc workspace hiện tại." action={<Link className="button button-primary" href="/tasks">Về danh sách công việc</Link>} />
    </AppShell>
  );
}
