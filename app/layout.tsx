import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "产品知识库",
  description: "用一个 Next.js 项目把页面、接口、SQL 和 Agent 串起来",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
