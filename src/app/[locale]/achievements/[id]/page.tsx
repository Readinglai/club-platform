/**
 * app/[locale]/achievements/[id]/page.tsx — 過往成果詳情頁（Async Server Component）
 *
 * 動態路由：根據 URL 中的 [id] 參數從假資料查找對應成就。
 * 找不到成就時呼叫 notFound() 回傳 404。
 *
 * 顯示完整成就資訊：
 * - 大型封面圖片
 * - 年份 badge、標題
 * - 完整描述（支援段落與列表渲染）
 * - 返回列表連結
 * - 前/後成就導覽（依年份排序）
 *
 * ⚠️ async Server Component 使用 getTranslations（非 useTranslations hook）
 *
 * TODO: 替換假資料查詢為 Prisma
 * 主題色：primary #1a2744、secondary #c9b99a
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  getAchievementById,
  getAllAchievements,
} from "@/lib/data/achievements";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── 靜態路徑預生成 ──────────────────────────────────────────────────────────

/**
 * generateStaticParams — 為每筆成就預先生成靜態路徑
 * TODO: 接資料庫後改為非同步 Prisma 查詢
 */
export async function generateStaticParams() {
  const achievements = getAllAchievements();
  const locales = ["zh", "en"];
  return locales.flatMap((locale) =>
    achievements.map((a) => ({ locale, id: a.id }))
  );
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface AchievementDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AchievementDetailPage({
  params,
}: AchievementDetailPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("achievements");

  // 查找成就；找不到則 404
  const achievement = getAchievementById(id);
  if (!achievement) notFound();

  // 前/後成就導覽（依年份降冪排序後的前後筆）
  const allSorted = getAllAchievements();
  const currentIdx = allSorted.findIndex((a) => a.id === id);
  const prevAchievement = currentIdx > 0 ? allSorted[currentIdx - 1] : null;
  const nextAchievement =
    currentIdx < allSorted.length - 1 ? allSorted[currentIdx + 1] : null;

  // 依 \n\n 分段
  const descParagraphs = achievement.description
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* ── 頁首 Banner ── */}
      <section
        className="px-4 py-14 sm:py-18"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-4xl mx-auto">
          {/* 麵包屑 */}
          <nav className="flex items-center gap-2 text-sm mb-6" aria-label="麵包屑">
            <Link
              href={`/${locale}/achievements`}
              className="transition-opacity hover:opacity-70"
              style={{ color: `${SECONDARY}99` }}
            >
              {t("title")}
            </Link>
            <span style={{ color: `${SECONDARY}44` }}>/</span>
            <span
              style={{ color: `${SECONDARY}77` }}
              className="truncate max-w-xs"
            >
              {achievement.title}
            </span>
          </nav>

          {/* 年份 badge + 標題 */}
          <div className="flex flex-col gap-3">
            <span
              className="inline-block w-fit px-3 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${SECONDARY}33`, color: SECONDARY }}
            >
              {achievement.year}
            </span>
            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight"
              style={{ color: SECONDARY }}
            >
              {achievement.title}
            </h1>
          </div>
        </div>
      </section>

      {/* ── 主要內容區 ── */}
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* 封面圖片 */}
        <div
          className="w-full rounded-2xl overflow-hidden shadow-sm"
          style={{ border: "1px solid #e5e7eb" }}
        >
          {/*
           * 使用 <img> 而非 Next.js <Image>，避免須在 next.config.ts 設定外部域名。
           * TODO: 替換為 next/image 並設定 remotePatterns（接真實圖片後）
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={achievement.image}
            alt={achievement.title}
            className="w-full object-cover"
            style={{ aspectRatio: "16/9" }}
          />
        </div>

        {/* 成果描述 */}
        <div
          className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <h2
            className="text-base font-semibold mb-5"
            style={{ color: PRIMARY }}
          >
            {t("descriptionTitle")}
          </h2>

          <div className="flex flex-col gap-4">
            {descParagraphs.map((para, idx) => {
              // 以「-」開頭的行視為無序列表
              if (para.startsWith("-")) {
                const items = para
                  .split("\n")
                  .map((l) => l.replace(/^-\s*/, "").trim())
                  .filter(Boolean);
                return (
                  <ul key={idx} className="list-none flex flex-col gap-1.5 pl-2">
                    {items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <span
                          style={{ color: SECONDARY }}
                          className="mt-1 flex-shrink-0"
                        >
                          ▸
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-sm text-gray-600 leading-relaxed">
                  {para}
                </p>
              );
            })}
          </div>
        </div>

        {/* ── 前/後成就導覽 ── */}
        {(prevAchievement || nextAchievement) && (
          <div
            className="grid grid-cols-2 gap-4"
            aria-label="前後成就導覽"
          >
            {/* 上一篇（年份較新） */}
            {prevAchievement ? (
              <Link
                href={`/${locale}/achievements/${prevAchievement.id}`}
                className="group flex flex-col gap-1 p-4 rounded-xl border bg-white
                           transition-all hover:shadow-sm hover:border-gray-300"
                style={{ borderColor: "#e5e7eb" }}
              >
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  {t("prevAchievement")}
                </span>
                <span
                  className="text-sm font-medium line-clamp-2 group-hover:opacity-80"
                  style={{ color: PRIMARY }}
                >
                  {prevAchievement.title}
                </span>
                <span className="text-xs" style={{ color: SECONDARY }}>
                  {prevAchievement.year}
                </span>
              </Link>
            ) : (
              <div />
            )}

            {/* 下一篇（年份較舊） */}
            {nextAchievement ? (
              <Link
                href={`/${locale}/achievements/${nextAchievement.id}`}
                className="group flex flex-col gap-1 p-4 rounded-xl border bg-white text-right
                           transition-all hover:shadow-sm hover:border-gray-300"
                style={{ borderColor: "#e5e7eb" }}
              >
                <span className="text-xs text-gray-400 flex items-center justify-end gap-1">
                  {t("nextAchievement")}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <span
                  className="text-sm font-medium line-clamp-2 group-hover:opacity-80"
                  style={{ color: PRIMARY }}
                >
                  {nextAchievement.title}
                </span>
                <span className="text-xs" style={{ color: SECONDARY }}>
                  {nextAchievement.year}
                </span>
              </Link>
            ) : (
              <div />
            )}
          </div>
        )}

        {/* 返回列表按鈕 */}
        <div>
          <Link
            href={`/${locale}/achievements`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                       text-sm font-medium border transition-all hover:opacity-80"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {t("backToList")}
          </Link>
        </div>
      </div>
    </div>
  );
}
