/**
 * app/layout.tsx — 根 Layout（Root Layout）
 *
 * Next.js App Router 的最頂層 Layout，必須包含 <html> 和 <body>。
 * 這個 Layout 是所有頁面的基礎外殼。
 *
 * Only this layout renders <html> and <body>; nested layouts (the public
 * site's [locale] layout, the portal) render just their content inside it.
 * The language comes from the address on /[locale] pages and from the
 * visitor's chosen language elsewhere (see src/i18n/request.ts).
 */

import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROCSAUT",
  description: "Republic of China Student Association at University of Toronto",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
