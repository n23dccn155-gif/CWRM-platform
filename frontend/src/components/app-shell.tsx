"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { href: "/manager", label: "Tổng quan", group: "Manager" },
  { href: "/tasks", label: "Công việc", group: "Manager" },
  { href: "/tasks/new", label: "Tạo công việc", group: "Manager" },
  { href: "/review", label: "Nghiệm thu", group: "Manager" },
  { href: "/risk", label: "Rủi ro", group: "Manager" },
  { href: "/my-work", label: "Việc của tôi", group: "Member" },
  { href: "/open-work", label: "Việc mở", group: "Member" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/manager" className="brand" aria-label="CWRM, về trang tổng quan">
          <span className="brand-mark">C</span>
          <span>
            <strong>CWRM</strong>
            <small>Work coordination</small>
          </span>
        </Link>
        <div className="workspace-chip">
          <span className="workspace-dot" /> Workspace minh họa
        </div>
        <nav aria-label="Điều hướng chính">
          {(["Manager", "Member"] as const).map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-group-label">Giao diện {group}</p>
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
                    {item.label}
                  </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <p className="sidebar-note">Bản xem trước UI. Quyền Manager/Member sẽ do backend xác thực theo workspace.</p>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-eyebrow">CWRM / Frontend skeleton</span>
            <strong>Điều phối công việc và quản trị rủi ro</strong>
          </div>
          <div className="topbar-tools">
            <span className="demo-pill">Dữ liệu minh họa</span>
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
