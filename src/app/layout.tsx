/**
 * app/layout.tsx — 根 Layout（Root Layout）
 *
 * Next.js App Router 的最頂層 Layout，必須包含 <html> 和 <body>。
 * 這個 Layout 是所有頁面的基礎外殼。
 *
 * 語言（locale）由 middleware.ts 解析後注入到 [locale] 路由段，
 * 在 app/[locale]/layout.tsx 中透過 params.locale 使用。
 *
 * 此 Root Layout 故意保持最小化，
 * 語系、字體、Navbar 等設定都在 app/[locale]/layout.tsx 處理。
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROCSAUT",
  description: "Republic of China Student Association at University of Toronto",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang 會由 [locale]/layout.tsx 透過 suppressHydrationWarning 機制覆蓋
    // suppressHydrationWarning 避免伺服器/客戶端 lang 屬性不一致的水合警告
    <html suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
