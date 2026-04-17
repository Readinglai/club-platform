/**
 * app/[locale]/layout.tsx — 語系 Layout
 *
 * 負責：
 * 1. 從路由參數取得 locale（zh / en）
 * 2. 設定 <html lang> 屬性，確保瀏覽器與 SEO 正確識別語言
 * 3. 用 NextIntlClientProvider 包裹頁面，讓 Client Components 也能使用翻譯
 * 4. 渲染全站 Navbar
 *
 * NextIntlClientProvider 必須在 Client Components 的最外層，
 * 這樣所有子元件才能呼叫 useTranslations() hook。
 */

import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Navbar from "@/components/Navbar";

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  // 從路由參數解析 locale
  const { locale } = await params;

  // 若 locale 不在支援清單中，回傳 404
  if (!routing.locales.includes(locale as "zh" | "en")) {
    notFound();
  }

  // 在伺服器端載入對應語言的所有訊息，傳給 Provider
  // getMessages() 會自動讀取 src/i18n/request.ts 設定的訊息
  const messages = await getMessages();

  return (
    // 設定 lang 屬性，讓瀏覽器與螢幕閱讀器正確處理語言
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* NextIntlClientProvider 將翻譯訊息注入到所有子 Client Components */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/* 全站 Navbar，含語言切換和響應式漢堡選單 */}
          <Navbar />
          {/* 頁面主要內容 */}
          <main className="flex-1">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
