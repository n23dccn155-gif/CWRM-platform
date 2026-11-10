import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CWRM — Điều phối công việc và quản trị rủi ro",
  description: "Frontend skeleton cho nền tảng điều phối công việc và quản trị rủi ro đa lĩnh vực.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
