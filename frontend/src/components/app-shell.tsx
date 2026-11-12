"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavItem {
  href: string;
  label: string;
  group: "Manager" | "Member";
  number: string;
  team: string;
}

const navigation: NavItem[] = [
  { href: "/manager", label: "Tổng quan điều hành", group: "Manager", number: "01", team: "Ban Điều phối" },
  { href: "/tasks", label: "Quản lý công việc", group: "Manager", number: "02", team: "Ban Điều phối" },
  { href: "/review", label: "Kiểm duyệt & Nghiệm thu", group: "Manager", number: "03", team: "Ban Điều phối" },
  { href: "/risk", label: "Kiểm soát rủi ro", group: "Manager", number: "04", team: "Ban Điều phối" },
  { href: "/my-work", label: "Nhiệm vụ trực tiếp", group: "Member", number: "01", team: "Đội ngũ Thực thi" },
  { href: "/open-work", label: "Hàng đợi nhận việc", group: "Member", number: "02", team: "Đội ngũ Thực thi" },
];

function resolveScreenInfo(pathname: string): { screen: string; team: string } {
  const matched = navigation.find((item) => item.href === pathname);
  if (matched) {
    return { screen: matched.label, team: matched.team };
  }
  if (pathname === "/tasks/new") {
    return { screen: "Khởi tạo công việc", team: "Ban Điều phối" };
  }
  if (pathname.startsWith("/tasks/")) {
    return { screen: "Chi tiết công việc", team: "Ban Điều phối" };
  }
  return { screen: "Bàn làm việc", team: "Hệ thống" };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { screen, team } = resolveScreenInfo(pathname);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (/^TASK-\d+/i.test(q)) {
      router.push(`/tasks/${q.toUpperCase()}`);
    } else {
      router.push(`/tasks`);
    }
  }

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/manager" className="brand" aria-label="CWRM, về trang tổng quan điều hành">
          <span className="brand-mark">
            C<span className="brand-mark-dot" />
          </span>
          <span>
            <strong>CWRM</strong>
            <small>Hệ thống Điều hành</small>
          </span>
        </Link>
        <div className="workspace-chip">
          <span className="workspace-dot" />
          <span>
            <small>WORKSPACE ĐIỀU HÀNH</small>
            <strong>CWRM Enterprise Core</strong>
          </span>
          <span className="workspace-caret" aria-hidden="true">⌄</span>
        </div>
        <nav aria-label="Điều hướng chính">
          {(["Manager", "Member"] as const).map((group) => (
            <div className="nav-group" key={group}>
              <p className="nav-group-label">
                {group === "Manager" ? "ĐIỀU HÀNH DỰ ÁN" : "TÁC NGHIỆP TRỰC TIẾP"} <span>{group}</span>
              </p>
              {navigation
                .filter((item) => item.group === group)
                .map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href === "/tasks" && pathname.startsWith("/tasks"));
                  return (
                    <Link
                      href={item.href}
                      key={item.href}
                      className={`nav-link ${active ? "active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span className="nav-number font-mono tabular-nums" aria-hidden="true">
                        {item.number}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>Môi trường Điều hành</strong>
          <span>Phân quyền thực thi cấp dự án. Đồng bộ trạng thái tức thời.</span>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <nav aria-label="Điều hướng phân cấp" className="breadcrumbs">
              <ol className="breadcrumb-list">
                <li className="breadcrumb-item">
                  <Link href="/manager" className="breadcrumb-link">
                    Không gian CWRM
                  </Link>
                </li>
                <li className="breadcrumb-separator" aria-hidden="true">/</li>
                <li className="breadcrumb-item">
                  <span className="breadcrumb-team">{team}</span>
                </li>
                <li className="breadcrumb-separator" aria-hidden="true">/</li>
                <li className="breadcrumb-item breadcrumb-current" aria-current="page">
                  <span className="breadcrumb-current-text">{screen}</span>
                </li>
              </ol>
            </nav>
          </div>
          <div className="topbar-tools">
            <form onSubmit={handleSearchSubmit} className="topbar-search">
              <svg
                className="topbar-search-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã task (VD: TASK-103)..."
                className="topbar-search-input"
                aria-label="Tìm kiếm hoặc điều lệnh nhanh"
              />
              <kbd className="topbar-search-kbd font-mono tabular-nums" title="Nhấn Ctrl+K để tìm">Ctrl+K</kbd>
            </form>
            <Link
              href="/login"
              className="user-profile-chip"
              title="Đổi vai trò hoặc đăng xuất tại /login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--card-soft)",
                color: "var(--text)",
                fontSize: 11.5,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 9.5,
                  fontWeight: 800,
                }}
              >
                {pathname.startsWith("/my-work") || pathname.startsWith("/open-work") ? "M" : "A"}
              </span>
              <span>
                {pathname.startsWith("/my-work") || pathname.startsWith("/open-work")
                  ? "Nguyễn Bình (Member)"
                  : "Lê Đình Bảo (Manager)"}
              </span>
            </Link>
            <span className="demo-pill">
              <span className="demo-pill-dot" /> Trực tuyến
            </span>
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
