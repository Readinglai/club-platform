"use client";

/**
 * components/AchievementsGrid.tsx — 成就卡片網格 + 年份篩選（Client Component）
 *
 * 此元件負責：
 * 1. 年份篩選按鈕（需要 useState，所以必須是 Client Component）
 * 2. 依選定年份過濾成就卡片
 * 3. 渲染成就卡片網格
 *
 * 架構說明：
 *   Server Component（page.tsx）取得資料 → 序列化傳入此 Client Component
 *   Client Component 僅做 UI 過濾，不發網路請求
 *
 * 使用 useTranslations("achievements") 讀取翻譯。
 * （Client Component 可使用 useTranslations hook）
 *
 * 主題色：primary #1a2744、secondary #c9b99a
 */

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Achievement } from "@/lib/data/achievements";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── 單張成就卡片 ──────────────────────────────────────────────────────────────

interface AchievementCardProps {
  achievement: Achievement;
  locale: string;
}

function AchievementCard({ achievement, locale }: AchievementCardProps) {
  const t = useTranslations("achievements");
  const href = `/${locale}/achievements/${achievement.id}`;

  // 截斷描述至 100 字元
  const shortDesc = achievement.description
    .replace(/\n/g, " ")
    .slice(0, 100);
  const isTruncated = achievement.description.replace(/\n/g, " ").length > 100;

  return (
    <article
      className="group flex flex-col rounded-2xl overflow-hidden border bg-white
                 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderColor: "#e5e7eb" }}
    >
      {/* ── 封面圖片區 ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/9", backgroundColor: `${PRIMARY}11` }}
      >
        {/*
         * 使用 <img> 而非 Next.js <Image>，避免須在 next.config.ts 設定外部域名。
         * TODO: 替換為 next/image 並設定 remotePatterns（接真實圖片後）
         */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={achievement.image}
          alt={achievement.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* 年份 badge（圖片左上角） */}
        <div
          className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {achievement.year}
        </div>
      </div>

      {/* ── 卡片內容 ── */}
      <div className="flex flex-col gap-3 p-5 flex-1">
        <h3
          className="text-base font-bold leading-snug group-hover:opacity-80 transition-opacity"
          style={{ color: PRIMARY }}
        >
          {achievement.title}
        </h3>

        <p className="text-sm text-gray-500 leading-relaxed flex-1">
          {shortDesc}
          {isTruncated && "…"}
        </p>

        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-semibold mt-auto
                     transition-opacity hover:opacity-70"
          style={{ color: PRIMARY }}
        >
          {t("viewDetails")}
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  );
}

// ─── 主元件 ──────────────────────────────────────────────────────────────────

interface AchievementsGridProps {
  /** 所有成就資料（由 Server Component 傳入） */
  achievements: Achievement[];
  /** 所有年份清單（去重、降冪，由 Server Component 傳入） */
  years: number[];
  /** 目前語系 */
  locale: string;
}

export default function AchievementsGrid({
  achievements,
  years,
  locale,
}: AchievementsGridProps) {
  const t = useTranslations("achievements");

  // 選定的年份（null = 顯示全部）
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // 依年份過濾
  const filtered =
    selectedYear === null
      ? achievements
      : achievements.filter((a) => a.year === selectedYear);

  return (
    <div className="flex flex-col gap-8">
      {/* ── 年份篩選按鈕列 ── */}
      <div
        className="flex flex-wrap items-center gap-2 p-4 rounded-2xl bg-white shadow-sm"
        style={{ border: "1px solid #e5e7eb" }}
        role="group"
        aria-label={t("filterByYear")}
      >
        <span className="text-xs font-semibold text-gray-400 mr-1">
          {t("filterByYear")}
        </span>

        {/* 全部按鈕 */}
        <button
          onClick={() => setSelectedYear(null)}
          className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-150"
          style={
            selectedYear === null
              ? { backgroundColor: PRIMARY, color: SECONDARY }
              : { backgroundColor: "#f3f4f6", color: "#374151" }
          }
          aria-pressed={selectedYear === null}
        >
          {t("allYears")}
        </button>

        {/* 各年份按鈕 */}
        {years.map((year) => (
          <button
            key={year}
            onClick={() =>
              setSelectedYear(selectedYear === year ? null : year)
            }
            className="px-3 py-1 rounded-full text-sm font-medium transition-all duration-150"
            style={
              selectedYear === year
                ? { backgroundColor: PRIMARY, color: SECONDARY }
                : { backgroundColor: "#f3f4f6", color: "#374151" }
            }
            aria-pressed={selectedYear === year}
          >
            {year}
          </button>
        ))}

        {/* 篩選結果計數 */}
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} / {achievements.length}
        </span>
      </div>

      {/* ── 成就卡片網格 ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <AchievementCard key={a.id} achievement={a} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
