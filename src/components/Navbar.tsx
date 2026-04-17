"use client";

/**
 * components/Navbar.tsx — 全站導覽列（Client Component）
 *
 * 功能：
 * - 桌面版：水平列出所有導覽連結
 * - 手機版：漢堡選單（Hamburger Menu），點擊後展開下拉選單
 * - 語言切換按鈕：目前語言為 zh 時顯示「EN」，為 en 時顯示「中文」
 * - 使用 useTranslations() 讀取 nav 命名空間的翻譯文字
 * - 使用 usePathname / useRouter 實現語言切換（切換 locale 前綴）
 *
 * 主題色：
 * - 背景：primary #1a2744（深藍）
 * - 文字 / 連結：secondary #c9b99a（米色）
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

// 導覽連結設定（href 使用 [locale] 路由前綴之後的相對路徑）
const NAV_LINKS = [
  { key: "home", href: "/" },
  { key: "events", href: "/events" },
  { key: "members", href: "/members" },
  { key: "achievements", href: "/achievements" },
  { key: "sponsors", href: "/sponsors" },
  { key: "contact", href: "/contact" },
] as const;

// 主題色常數
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default function Navbar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  // 手機版漢堡選單開關狀態
  const [menuOpen, setMenuOpen] = useState(false);

  // 從 URL pathname 解析目前語言（第一個路徑段）
  // pathname 格式：/zh/events → locale = "zh"
  const currentLocale = pathname.split("/")[1] || "zh";

  /**
   * 切換語言：將 pathname 的 locale 前綴替換為另一個語言
   * 例如 /zh/events → /en/events
   */
  const handleLangSwitch = () => {
    const targetLocale = currentLocale === "zh" ? "en" : "zh";
    // 移除開頭的 /[locale] 段，換成目標語言
    const segments = pathname.split("/");
    segments[1] = targetLocale; // 替換第一個路徑段（locale）
    const newPath = segments.join("/") || `/${targetLocale}`;
    router.push(newPath);
  };

  /**
   * 為連結加上 locale 前綴
   * 例如 href="/events" + locale="zh" → "/zh/events"
   */
  const localizedHref = (href: string) => {
    return href === "/" ? `/${currentLocale}` : `/${currentLocale}${href}`;
  };

  return (
    <nav
      style={{ backgroundColor: PRIMARY }}
      className="sticky top-0 z-50 shadow-md"
      aria-label="主導覽列"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── 左側：Logo ── */}
          <Link
            href={`/${currentLocale}`}
            className="flex-shrink-0 flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              src="/assets/logo.png"
              alt="ROCSAUT"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
            <span className="font-bold text-base tracking-widest hidden sm:block" style={{ color: SECONDARY }}>
              ROCSAUT
            </span>
          </Link>

          {/* ── 桌面版導覽連結（md 以上顯示） ── */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ key, href }) => {
              const fullHref = localizedHref(href);
              const isActive = pathname === fullHref;

              return (
                <Link
                  key={key}
                  href={fullHref}
                  className="text-sm font-medium transition-all duration-150 hover:opacity-100 pb-0.5"
                  style={{
                    color: isActive ? SECONDARY : `${SECONDARY}bb`,
                    // 底線標示目前頁面
                    borderBottom: isActive
                      ? `2px solid ${SECONDARY}`
                      : "2px solid transparent",
                  }}
                >
                  {t(key)}
                </Link>
              );
            })}

            {/* 語言切換按鈕 */}
            <button
              onClick={handleLangSwitch}
              className="ml-2 px-3 py-1 rounded-md text-xs font-semibold tracking-wide border transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{
                borderColor: SECONDARY,
                color: PRIMARY,
                backgroundColor: SECONDARY,
              }}
              aria-label="切換語言"
            >
              {t("switchLang")}
            </button>
          </div>

          {/* ── 手機版：右側漢堡按鈕（md 以下顯示） ── */}
          <div className="flex md:hidden items-center gap-3">
            {/* 語言切換按鈕（手機版也顯示） */}
            <button
              onClick={handleLangSwitch}
              className="px-2 py-1 rounded text-xs font-semibold border"
              style={{
                borderColor: SECONDARY,
                color: PRIMARY,
                backgroundColor: SECONDARY,
              }}
              aria-label="切換語言"
            >
              {t("switchLang")}
            </button>

            {/* 漢堡 / 關閉圖示按鈕 */}
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-1 rounded transition-opacity hover:opacity-80"
              style={{ color: SECONDARY }}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "關閉選單" : "開啟選單"}
            >
              {menuOpen ? (
                // 關閉圖示（X）
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                // 漢堡圖示（三條橫線）
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 手機版下拉選單 ── */}
      {menuOpen && (
        <div
          className="md:hidden border-t"
          style={{ borderColor: `${SECONDARY}33`, backgroundColor: PRIMARY }}
        >
          <div className="px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ key, href }) => {
              const fullHref = localizedHref(href);
              const isActive = pathname === fullHref;

              return (
                <Link
                  key={key}
                  href={fullHref}
                  onClick={() => setMenuOpen(false)} // 點擊後關閉選單
                  className="block px-3 py-2 rounded-md text-sm font-medium transition-all duration-150"
                  style={{
                    color: isActive ? PRIMARY : SECONDARY,
                    backgroundColor: isActive ? SECONDARY : "transparent",
                  }}
                >
                  {t(key)}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
