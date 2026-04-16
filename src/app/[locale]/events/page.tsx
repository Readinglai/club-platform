/**
 * app/[locale]/events/page.tsx — 活動列表頁（Async Server Component）
 *
 * 顯示所有活動的卡片列表，每筆活動包含：
 * - 標題、日期（台灣慣用格式）、地點、簡介（截斷 120 字）
 * - 查看詳情連結、名額資訊
 * - 頂部提供「查看日曆」快捷連結
 *
 * ⚠️ 因為此頁是 async Server Component，需使用 getTranslations()（非 useTranslations）。
 *    useTranslations 是 hook，只能在同步 React 函式元件或 Client Component 中使用。
 *    getTranslations 回傳 Promise，await 後取得翻譯函式。
 *
 * 主題色：primary #1a2744、secondary #c9b99a
 */

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAllEvents, type Event } from "@/lib/data/events";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── 日期格式化 ───────────────────────────────────────────────────────────────

/**
 * formatEventDate — 將 Date 物件格式化為易讀字串
 *
 * 輸出範例（locale = "zh"）：2025年9月13日（六）下午 2:00
 * 輸出範例（locale = "en"）：Sat, Sep 13, 2025 · 2:00 PM
 *
 * 使用 Intl.DateTimeFormat 避免引入額外日期函式庫，天然支援多語系。
 */
function formatEventDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

// ─── 型別：翻譯函式（從 getTranslations 取得） ─────────────────────────────

// Awaited<ReturnType<typeof getTranslations<"events">>> 型別較複雜，
// 直接用 (key: string, values?: Record<string, unknown>) => string 泛化即可
type TFn = (key: string, values?: Record<string, unknown>) => string;

// ─── 單張活動卡片 ─────────────────────────────────────────────────────────────

interface EventCardProps {
  event: Event;
  locale: string;
  t: TFn;
}

function EventCard({ event, locale, t }: EventCardProps) {
  const href = `/${locale}/events/${event.id}`;

  // 截斷描述至 120 字元（去除 Markdown 換行符）
  const shortDesc = event.description.replace(/\n/g, " ").slice(0, 120);
  const isDescTruncated = event.description.replace(/\n/g, " ").length > 120;

  return (
    <article
      className="group flex flex-col rounded-2xl border overflow-hidden transition-shadow duration-200 hover:shadow-lg"
      style={{ borderColor: "#e5e7eb" }}
    >
      {/* 頂部色帶（主題色裝飾條） */}
      <div className="h-1.5" style={{ backgroundColor: PRIMARY }} />

      <div className="flex flex-col gap-4 p-6">
        {/* 日期標籤 */}
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            style={{ color: SECONDARY }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <time
            dateTime={event.date.toISOString()}
            className="text-sm font-medium"
            style={{ color: SECONDARY }}
          >
            {formatEventDate(event.date, locale)}
          </time>
        </div>

        {/* 活動標題 */}
        <h2
          className="text-xl font-bold leading-snug group-hover:opacity-80 transition-opacity"
          style={{ color: PRIMARY }}
        >
          {event.title}
        </h2>

        {/* 地點 */}
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 flex-shrink-0 mt-0.5"
            style={{ color: "#9ca3af" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm text-gray-500 leading-relaxed">
            {event.location}
          </span>
        </div>

        {/* 簡介 */}
        <p className="text-sm text-gray-600 leading-relaxed flex-1">
          {shortDesc}
          {isDescTruncated && "…"}
        </p>

        {/* 底部：名額資訊 + 查看詳情連結 */}
        <div
          className="flex items-center justify-between pt-2 border-t"
          style={{ borderColor: "#f3f4f6" }}
        >
          {/* 名額顯示 */}
          {event.capacity !== null ? (
            <span className="text-xs text-gray-400">
              {t("capacity")}: {event.capacity}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{t("noCapacityLimit")}</span>
          )}

          {/* 查看詳情連結 */}
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: PRIMARY }}
          >
            {t("readMore")}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface EventsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { locale } = await params;

  // async Server Component 使用 getTranslations（非 useTranslations hook）
  const t = await getTranslations("events");
  const events = getAllEvents();

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

          {/* 日曆視圖快捷連結 */}
          <Link
            href={`/${locale}/events/calendar`}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-90"
            style={{ borderColor: `${SECONDARY}88`, color: SECONDARY }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {t("viewCalendar")}
          </Link>
        </div>
      </section>

      {/* ── 活動卡片列表 ── */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {events.length === 0 ? (
          /* 無活動時的空狀態 */
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">{t("noEvents")}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                locale={locale}
                t={t as TFn}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
