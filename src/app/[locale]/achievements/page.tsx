/**
 * app/[locale]/achievements/page.tsx — 過往成果列表頁（Async Server Component 外殼）
 *
 * 架構說明（Server wrapper + Client leaf）：
 * - 此頁是 async Server Component：
 *   1. 讀取所有成就假資料
 *   2. 取得年份清單（用於篩選按鈕）
 *   3. 序列化後傳給 AchievementsGrid Client Component
 *
 * - AchievementsGrid（Client Component）：
 *   1. 維護「選定年份」的 UI 狀態（useState）
 *   2. 依年份即時過濾卡片，無需 page reload
 *   3. 渲染成就卡片網格（含封面圖、標題、摘要、查看詳情連結）
 *
 * ⚠️ async Server Component 使用 getTranslations（非 useTranslations hook）
 *
 * 主題色：primary #1a2744、secondary #c9b99a
 */

import { getTranslations } from "next-intl/server";
import { getAllAchievements, getAchievementYears } from "@/lib/data/achievements";
import AchievementsGrid from "@/components/AchievementsGrid";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface AchievementsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AchievementsPage({
  params,
}: AchievementsPageProps) {
  const { locale } = await params;
  const t = await getTranslations("achievements");

  // 所有成就資料（降冪排序）
  const achievements = getAllAchievements();
  // 年份清單（去重、降冪）
  const years = getAchievementYears();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* ── 頁首 Banner ── */}
      <section
        className="px-4 py-16 sm:py-20 text-center"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-wide"
            style={{ color: SECONDARY }}
          >
            {t("title")}
          </h1>
          <div
            className="w-12 h-0.5 rounded-full"
            style={{ backgroundColor: `${SECONDARY}88` }}
          />
          <p className="text-base" style={{ color: `${SECONDARY}99` }}>
            {t("subtitle")}
          </p>

          {/* 統計數字（成就筆數 + 年份跨度） */}
          <div className="flex items-center gap-8 mt-2">
            <div className="flex flex-col items-center">
              <span
                className="text-3xl font-bold"
                style={{ color: SECONDARY }}
              >
                {achievements.length}
              </span>
              <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>
                {t("totalAchievements")}
              </span>
            </div>
            <div
              className="w-px h-10"
              style={{ backgroundColor: `${SECONDARY}44` }}
            />
            <div className="flex flex-col items-center">
              <span
                className="text-3xl font-bold"
                style={{ color: SECONDARY }}
              >
                {years.length > 0 ? `${years[years.length - 1]}–${years[0]}` : "—"}
              </span>
              <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>
                {t("yearSpan")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 年份篩選 + 成就卡片 ── */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        {/*
         * AchievementsGrid 是 Client Component，負責互動式年份篩選 + 卡片渲染。
         * 資料在 Server Component 取得，序列化後作為 props 傳入。
         */}
        <AchievementsGrid
          achievements={achievements}
          years={years}
          locale={locale}
        />
      </section>
    </div>
  );
}
