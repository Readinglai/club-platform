/**
 * app/[locale]/page.tsx — 公開首頁（Server Component）
 *
 * 包含三個 Section：
 * 1. Hero — 標題、副標題、CTA 按鈕
 * 2. About — 社團介紹段落
 * 3. Contact — 引入 ContactForm Client Component
 *
 * 使用 useTranslations() 讀取 i18n 翻譯文字。
 * 標示 TODO 的地方將在後續整合真實資料（從 CMS / 資料庫取得）。
 *
 * 主題色：primary #1a2744、secondary #c9b99a
 */

import { useTranslations } from "next-intl";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── Hero Section ────────────────────────────────────────────────────────────

function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section
      className="relative flex flex-col items-center justify-center text-center px-4 py-28 sm:py-40"
      style={{ backgroundColor: PRIMARY }}
      aria-label="Hero section"
    >
      {/* 背景裝飾圓（佔位，TODO: 換成真實背景圖片） */}
      {/* TODO: 替換為設計稿的背景圖片或動態效果 */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #c9b99a 0%, transparent 50%), radial-gradient(circle at 80% 20%, #c9b99a 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
        {/* 社團名稱大標題 */}
        {/* TODO: 從 config.yaml 或 CMS 動態載入社團名稱 */}
        <h1
          className="text-5xl sm:text-7xl font-bold tracking-[0.15em]"
          style={{ color: SECONDARY }}
        >
          {t("title")}
        </h1>

        {/* 副標題 */}
        {/* TODO: 從 config.yaml 取得 tagline 欄位 */}
        <p
          className="text-lg sm:text-xl font-light tracking-wide"
          style={{ color: `${SECONDARY}cc` }}
        >
          {t("subtitle")}
        </p>

        {/* 簡短描述 */}
        {/* TODO: 從 config.yaml 取得 description 欄位 */}
        <p
          className="text-sm sm:text-base leading-relaxed max-w-md"
          style={{ color: `${SECONDARY}99` }}
        >
          {t("description")}
        </p>

        {/* CTA 按鈕群 */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          {/* 主要 CTA：了解更多 → 跳至 About section */}
          {/* TODO: 確認最終 CTA 目標，可能改為活動頁面或入會頁面 */}
          <a
            href="#about"
            className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ backgroundColor: SECONDARY, color: PRIMARY }}
          >
            {t("ctaPrimary")}
          </a>

          {/* 次要 CTA：聯絡我們 → 跳至 Contact section */}
          <a
            href="#contact"
            className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide border transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ borderColor: `${SECONDARY}88`, color: `${SECONDARY}cc` }}
          >
            {t("ctaSecondary")}
          </a>
        </div>
      </div>

      {/* 向下箭頭（引導用戶捲動） */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        aria-hidden="true"
        style={{ color: `${SECONDARY}55` }}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </section>
  );
}

// ─── About Section ───────────────────────────────────────────────────────────

function AboutSection() {
  const t = useTranslations("about");

  return (
    <section
      id="about"
      className="px-4 py-20 sm:py-28"
      style={{ backgroundColor: "#f9f7f4" }}
      aria-label="About section"
    >
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
        {/* 區塊標題 */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-wide"
            style={{ color: PRIMARY }}
          >
            {t("title")}
          </h2>
          {/* 裝飾分隔線 */}
          <div
            className="w-12 h-0.5 rounded-full"
            style={{ backgroundColor: SECONDARY }}
          />
        </div>

        {/* 介紹段落 */}
        {/* TODO: 從 CMS 或設定檔動態載入社團介紹文字 */}
        <div className="flex flex-col gap-5 text-center">
          <p
            className="text-base sm:text-lg leading-relaxed"
            style={{ color: "#555" }}
          >
            {t("paragraph1")}
          </p>
          <p
            className="text-base sm:text-lg leading-relaxed"
            style={{ color: "#555" }}
          >
            {t("paragraph2")}
          </p>
          <p
            className="text-base sm:text-lg leading-relaxed"
            style={{ color: "#555" }}
          >
            {t("paragraph3")}
          </p>
        </div>

        {/* 快速數據卡片（假資料佔位） */}
        {/* TODO: 從資料庫取得真實的成員數、活動數、成立年份 */}
        <div className="grid grid-cols-3 gap-6 mt-4 w-full">
          {[
            { label: "成員", value: "100+" },
            { label: "活動", value: "50+" },
            { label: "成立", value: "2020" },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 p-4 rounded-xl"
              style={{ backgroundColor: "#fff", boxShadow: "0 1px 8px #0001" }}
            >
              <span
                className="text-2xl font-bold"
                style={{ color: PRIMARY }}
              >
                {value}
              </span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Contact Section ──────────────────────────────────────────────────────────

function ContactSection() {
  const t = useTranslations("contact");

  return (
    <section
      id="contact"
      className="px-4 py-20 sm:py-28"
      style={{ backgroundColor: "#fff" }}
      aria-label="Contact section"
    >
      <div className="max-w-2xl mx-auto flex flex-col items-center gap-8">
        {/* 區塊標題 */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-wide"
            style={{ color: PRIMARY }}
          >
            {t("title")}
          </h2>
          <div
            className="w-12 h-0.5 rounded-full"
            style={{ backgroundColor: SECONDARY }}
          />
          <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
        </div>

        {/* 聯絡表單（Client Component） */}
        <div className="w-full">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ContactSection />
    </>
  );
}
