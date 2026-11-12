"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { href: "/manager", label: "Tổng quan", group: "Manager", number: "01" },
  { href: "/tasks", label: "Công việc", group: "Manager", number: "02" },
  { href: "/review", label: "Chờ nghiệm thu", group: "Manager", number: "03" },
  { href: "/risk", label: "Rủi ro", group: "Manager", number: "04" },
  { href: "/my-work", label: "Việc của tôi", group: "Member", number: "01" },
  { href: "/open-work", label: "Việc mở", group: "Member", number: "02" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/manager" className="brand" aria-label="CWRM, về trang tổng quan">
          <span className="brand-mark">C<span className="brand-mark-dot" /></span>
          <span>
            <strong>CWRM</strong>
            <small>Work management</small>
          </span>
        </Link>
        <div className="workspace-chip">
          <span className="workspace-dot" />
          <span><small>WORKSPACE ĐANG XEM</small><strong>Không gian mẫu</strong></span>
          <span className="workspace-caret" aria-hidden="true">⌄</span>
        </div>
        <nav aria-label="Điều hướng chính">
          {(["Manager", "Member"] as const).map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-group-label">{group === "Manager" ? "Điều phối" : "Công việc cá nhân"} <span>{group}</span></p>
              {navigation
                .filter((item) => item.group === group)
                .map((item) => {
                  const active = pathname === item.href || (item.href === "/tasks" && pathname.startsWith("/tasks/") && pathname !== "/tasks/new");
                  return (
                  <Link
                    href={item.href}
                    key={item.href}
                    className={`nav-link ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="nav-number" aria-hidden="true">{item.number}</span>
                    {item.label}
                  </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <p className="sidebar-note"><strong>Bản xem trước</strong><span>Đang dùng dữ liệu mẫu. Quyền truy cập sẽ do backend kiểm tra theo workspace.</span></p>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-eyebrow">Workspace <span aria-hidden="true">/</span> Không gian mẫu</span>
            <strong>{navigation.find((item) => item.href === pathname)?.label ?? (pathname === "/tasks/new" ? "Tạo công việc" : pathname.startsWith("/tasks/") ? "Chi tiết công việc" : "Điều phối công việc")}</strong>
          </div>
          <div className="topbar-tools">
            <span className="demo-pill"><span className="demo-pill-dot" /> Dữ liệu mẫu</span>
            <ThemeToggle />
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}
