import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CWRM — Điều phối công việc và quản trị rủi ro",
  description: "Frontend skeleton cho nền tảng điều phối công việc và quản trị rủi ro đa lĩnh vực.",
};

const themeScript = `(function(){try{var s=localStorage.getItem("cwrm-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
