/**
 * app/[locale]/events/calendar/page.tsx — 活動日曆頁（Async Server Component 外殼）
 *
 * 架構說明（Server wrapper + Client leaf 模式）：
 * - 此頁是 async Server Component：
 *   1. 讀取活動假資料（未來改為 Prisma 查詢）
 *   2. 用 getTranslations 讀取 i18n 訊息
 *   3. 序列化後傳給 EventCalendar Client Component
 *
 * - EventCalendar（Client Component）：
 *   1. 渲染 react-big-calendar（需要瀏覽器 DOM API）
 *   2. 處理用戶點擊事件，用 router.push 導航到詳情頁
 *
 * ⚠️ async Server Component 使用 getTranslations（非 useTranslations hook）
 *
 * TODO: 替換 getAllEvents() 為 Prisma 查詢後，此頁面無需修改
 */

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getAllEvents } from "@/lib/data/events";
import EventCalendar from "@/components/EventCalendar";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface CalendarPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { locale } = await params;

  // async Server Component 使用 getTranslations
  const t = await getTranslations("events");
  const events = getAllEvents();

  /**
   * calendarMessages — react-big-calendar 工具列的 i18n 文字
   *
   * 在 Server Component 中預先組合好，整包傳給 EventCalendar Client Component，
   * 避免 Client Component 直接呼叫 useTranslations（雖然也可以，但這樣更乾淨）。
   *
   * showMore 是函式，用來顯示「還有 N 場」的文字。
   * Next.js 允許將普通函式作為 prop 傳給 Client Component。
   */
  const calendarMessages = {
    month: t("calMonth"),
    week: t("calWeek"),
    day: t("calDay"),
    agenda: t("calAgenda"),
    today: t("calToday"),
    previous: t("calPrevious"),
    next: t("calNext"),
    noEventsInRange: t("calNoEvents"),
    /**
     * showMoreTemplate — 含 {count} 佔位符的模板字串
     *
     * 函式不能跨 Server→Client Component 邊界傳遞（Next.js 序列化限制），
     * 所以傳模板字串，讓 EventCalendar Client Component 在內部組合成函式。
     *
     * 範例（zh）："另外 {count} 場"
     * 範例（en）："{count} more"
     */
    showMoreTemplate: t("calShowMore", { count: "{count}" }),
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* ── 頁首 Banner ── */}
      <section
        className="px-4 py-14 sm:py-18"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-6xl mx-auto">
          {/* 麵包屑導覽 */}
          <nav
            className="flex items-center gap-2 text-sm mb-6"
            aria-label="麵包屑"
          >
            <Link
              href={`/${locale}/events`}
              className="transition-opacity hover:opacity-70"
              style={{ color: `${SECONDARY}99` }}
            >
              {t("title")}
            </Link>
            <span style={{ color: `${SECONDARY}44` }}>/</span>
            <span style={{ color: `${SECONDARY}77` }}>
              {t("calendarTitle")}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col gap-3">
              <h1
                className="text-3xl sm:text-4xl font-bold"
                style={{ color: SECONDARY }}
              >
                {t("calendarTitle")}
              </h1>
              <div
                className="w-10 h-0.5 rounded-full"
                style={{ backgroundColor: `${SECONDARY}66` }}
              />
              <p className="text-sm" style={{ color: `${SECONDARY}88` }}>
                {t("calendarSubtitle")}
              </p>
            </div>

            {/* 切換到列表視圖 */}
            <Link
              href={`/${locale}/events`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border self-start sm:self-auto transition-all hover:opacity-80"
              style={{ borderColor: `${SECONDARY}66`, color: SECONDARY }}
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
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              {t("viewList")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 日曆主體 ── */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div
          className="rounded-2xl bg-white p-4 sm:p-6 shadow-sm"
          style={{ border: "1px solid #e5e7eb" }}
        >
          {/*
           * EventCalendar 是 Client Component，接收：
           * - events: Event[]（活動資料，含 Date 物件）
           * - locale: string（語系）
           * - messages: 工具列 i18n 文字物件
           *
           * Date 物件跨越 Server→Client 邊界時，Next.js 會序列化為 ISO string，
           * 並在 Client 端反序列化回 Date。react-big-calendar 要求 Date 型別，
           * EventCalendar 內部用 new Date() 確保型別正確。
           */}
          <EventCalendar
            events={events}
            locale={locale}
            messages={calendarMessages}
          />
        </div>

        {/* 活動數量提示 */}
        <p className="text-center text-xs text-gray-400 mt-4">
          {locale === "zh"
            ? `共 ${events.length} 場活動，點擊活動查看詳情`
            : `${events.length} events total — click an event to view details`}
        </p>
      </section>
    </div>
  );
}
