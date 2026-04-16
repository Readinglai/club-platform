"use client";

/**
 * components/EventCalendar.tsx — 活動日曆 Client Component
 *
 * 使用 react-big-calendar 渲染互動式月曆。
 * 此元件必須為 Client Component（因 react-big-calendar 使用 DOM API）。
 *
 * 功能：
 * - 月 / 週 / 日 / 議程 視圖切換
 * - 點擊活動跳轉到活動詳情頁
 * - 活動顯示主題色（#1a2744 / #c9b99a）
 * - 支援 zh / en 語系
 *
 * 使用 dateFnsLocalizer 連接 date-fns v4，
 * 提供日期格式化和多語系支援。
 *
 * CSS 來源：react-big-calendar/lib/css/react-big-calendar.css
 * 自訂樣式在 <style> 標籤中覆寫，避免影響 globals.css。
 */

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, getDay, parse, startOfWeek, type Locale } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { enUS } from "date-fns/locale/en-US";
import type { Event as RBCEvent } from "react-big-calendar";

// 必要：引入 react-big-calendar 預設樣式
import "react-big-calendar/lib/css/react-big-calendar.css";

import type { Event as ClubEvent } from "@/lib/data/events";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── react-big-calendar 事件型別擴展 ─────────────────────────────────────────

/**
 * CalendarEvent — 擴展 react-big-calendar 的 Event 型別
 * 加入 resource.eventId 欄位，供點擊跳轉使用
 */
interface CalendarEvent extends RBCEvent {
  title: string;
  start: Date;
  end: Date;
  resource: {
    eventId: string; // 對應 ClubEvent.id，供路由跳轉使用
  };
}

// ─── dateFnsLocalizer 設定 ────────────────────────────────────────────────────

/**
 * 建立 date-fns localizer，傳入 react-big-calendar 所需的函式。
 * locales 物件的 key 必須與 Calendar 的 culture prop 對應。
 *
 * - "zh"：繁體中文（台灣）
 * - "en"：英文（美國）
 */
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date, options?: { locale?: Locale }) =>
    startOfWeek(date, { locale: options?.locale ?? enUS }),
  getDay,
  locales: {
    zh: zhTW,
    en: enUS,
  },
});

// ─── 視圖選項 ─────────────────────────────────────────────────────────────────

/** 支援的視圖清單：月 / 週 / 日 / 議程（宣告為可變陣列，符合 react-big-calendar 型別） */
const SUPPORTED_VIEWS = [Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA];

// ─── 元件 Props ───────────────────────────────────────────────────────────────

interface EventCalendarProps {
  /** 活動資料（從 Server Component 傳入） */
  events: ClubEvent[];
  /** 目前語系（"zh" | "en"） */
  locale: string;
  /** i18n 訊息（由 Server Component 傳入） */
  messages: {
    month: string;
    week: string;
    day: string;
    agenda: string;
    today: string;
    previous: string;
    next: string;
    noEventsInRange: string;
    /**
     * showMoreTemplate — 「還有更多」文字的模板字串（非函式）
     *
     * ⚠️ 函式不能跨 Server→Client Component 邊界傳遞（Next.js 限制），
     * 所以用模板字串傳入，EventCalendar 內部再組合成函式。
     * 格式：含 "{count}" 佔位符，例如 "另外 {count} 場" 或 "{count} more"
     */
    showMoreTemplate: string;
  };
}

// ─── 主元件 ──────────────────────────────────────────────────────────────────

export default function EventCalendar({
  events,
  locale,
  messages,
}: EventCalendarProps) {
  const router = useRouter();

  /**
   * 將 ClubEvent[] 轉換為 react-big-calendar 所需的 CalendarEvent[]
   * start = event.date, end = event.endDate
   */
  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      events.map((event) => ({
        title: event.title,
        start: event.date,
        end: event.endDate,
        resource: { eventId: event.id },
      })),
    [events]
  );

  /**
   * onSelectEvent — 點擊活動時跳轉到詳情頁
   */
  const handleSelectEvent = useCallback(
    (calEvent: CalendarEvent) => {
      router.push(`/${locale}/events/${calEvent.resource.eventId}`);
    },
    [router, locale]
  );

  /**
   * eventStyleGetter — 自訂活動色塊樣式（主題色）
   */
  const eventStyleGetter = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_event: CalendarEvent, _start: Date, _end: Date, _isSelected: boolean) => ({
      style: {
        backgroundColor: PRIMARY,
        color: SECONDARY,
        border: "none",
        borderRadius: "6px",
        fontSize: "0.75rem",
        fontWeight: 600,
        padding: "2px 6px",
        cursor: "pointer",
      },
    }),
    []
  );

  return (
    <>
      {/*
       * 覆寫 react-big-calendar 預設樣式
       * 使用 scope 方式避免污染全域 CSS
       */}
      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          background-color: ${PRIMARY};
          color: ${SECONDARY};
          font-weight: 600;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
          padding: 10px 4px;
          border-color: rgba(201, 185, 154, 0.2);
        }
        .rbc-toolbar button {
          color: ${PRIMARY};
          border-color: ${PRIMARY}44;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 500;
          padding: 6px 12px;
          transition: all 0.15s;
        }
        .rbc-toolbar button:hover,
        .rbc-toolbar button:focus {
          background-color: ${PRIMARY};
          color: ${SECONDARY};
          border-color: ${PRIMARY};
        }
        .rbc-toolbar button.rbc-active {
          background-color: ${PRIMARY};
          color: ${SECONDARY};
          border-color: ${PRIMARY};
        }
        .rbc-toolbar .rbc-toolbar-label {
          color: ${PRIMARY};
          font-weight: 700;
          font-size: 1rem;
        }
        .rbc-today {
          background-color: rgba(201, 185, 154, 0.12);
        }
        .rbc-off-range-bg {
          background-color: #f9f7f4;
        }
        .rbc-event {
          outline: none;
        }
        .rbc-event:focus {
          outline: 2px solid ${SECONDARY};
        }
        .rbc-show-more {
          color: ${PRIMARY};
          font-weight: 600;
          font-size: 0.7rem;
        }
        .rbc-month-row,
        .rbc-day-bg,
        .rbc-time-view,
        .rbc-time-header,
        .rbc-time-content,
        .rbc-time-slot,
        .rbc-agenda-view,
        .rbc-agenda-table {
          border-color: #e5e7eb;
        }
        .rbc-agenda-date-cell,
        .rbc-agenda-time-cell {
          color: #6b7280;
          font-size: 0.8rem;
        }
        .rbc-agenda-event-cell {
          color: ${PRIMARY};
          font-size: 0.85rem;
          cursor: pointer;
        }
      `}</style>

      <Calendar<CalendarEvent>
        localizer={localizer}
        events={calendarEvents}
        // 預設從最近一筆活動所在月份開始
        defaultDate={events[0]?.date ?? new Date()}
        defaultView={Views.MONTH}
        views={SUPPORTED_VIEWS}
        // 語系（對應 localizer 的 locales 物件 key）
        culture={locale}
        // 點擊活動跳轉詳情
        onSelectEvent={handleSelectEvent}
        // 活動顏色樣式
        eventPropGetter={eventStyleGetter}
        // 工具列 i18n 文字
        // showMore 函式在此組合（因函式不能跨 Server→Client 邊界傳遞）
        messages={{
          ...messages,
          showMore: (count: number) =>
            messages.showMoreTemplate.replace("{count}", String(count)),
        }}
        // 讓日曆高度固定
        style={{ minHeight: 640 }}
      />
    </>
  );
}
