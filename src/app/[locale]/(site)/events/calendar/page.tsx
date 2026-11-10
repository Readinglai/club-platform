/**
 * app/[locale]/events/calendar/page.tsx — 活動日曆頁（Async Server Component 外殼）
 */

import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Event } from "@/lib/data/events";
import { db } from "@/lib/db";
import EventCalendar from "@/components/EventCalendar";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface CalendarPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("events");

  // 從資料庫讀取所有已發布活動（含過去活動，讓日曆可向前翻閱）
  let events: Event[] = [];
  try {
    const rows = await db.event.findMany({
      where: { published: true },
      orderBy: { startAt: "asc" },
      select: { id: true, title: true, startAt: true, endAt: true, location: true, capacity: true },
    });
    events = rows.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startAt,
      endDate: e.endAt ?? e.startAt,
      location: e.location ?? "",
      description: "",
      registrationDeadline: null,
      capacity: e.capacity,
    }));
  } catch {
    // DB 無法連線時顯示空日曆
  }

  const calendarMessages = {
    month: t("calMonth"),
    week: t("calWeek"),
    day: t("calDay"),
    agenda: t("calAgenda"),
    today: t("calToday"),
    previous: t("calPrevious"),
    next: t("calNext"),
    noEventsInRange: t("calNoEvents"),
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
          <EventCalendar
            events={events}
            locale={locale}
            messages={calendarMessages}
          />
        </div>

        {/* 活動數量提示 */}
        <p className="text-center text-xs text-gray-400 mt-4">
          {t("calEventsCount", { count: events.length })}
        </p>
      </section>
    </div>
  );
}
