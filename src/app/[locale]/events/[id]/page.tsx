/**
 * app/[locale]/events/[id]/page.tsx — 活動詳情頁（Async Server Component）
 *
 * 動態路由：根據 URL 中的 [id] 參數從假資料查找對應活動。
 * 找不到活動時呼叫 notFound() 回傳 404。
 *
 * 顯示完整活動資訊：
 * - 標題、開始/結束日期時間、地點
 * - 完整描述（支援換行與列表段落）
 * - 報名截止日、活動名額
 * - 返回列表 / 查看日曆 導覽連結
 *
 * ⚠️ async Server Component 使用 getTranslations（非 useTranslations hook）
 *
 * TODO: 替換假資料查詢為 Prisma，並在此頁面加入報名按鈕（Module 2.2）
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getEventById, getAllEvents } from "@/lib/data/events";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── 靜態路徑預生成 ──────────────────────────────────────────────────────────

/**
 * generateStaticParams — 預先產生所有活動的靜態路徑
 *
 * 讓 Next.js 在 build 時就為每筆活動生成靜態頁面，提升載入速度。
 * TODO: 接資料庫後改為非同步 Prisma 查詢
 */
export async function generateStaticParams() {
  const events = getAllEvents();
  const locales = ["zh", "en"];
  return locales.flatMap((locale) =>
    events.map((event) => ({ locale, id: event.id }))
  );
}

// ─── 日期格式化工具 ───────────────────────────────────────────────────────────

/** formatFullDate — 詳細日期格式（含星期、年月日、時間、時區） */
function formatFullDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

/** formatDeadline — 報名截止日格式（只顯示日期） */
function formatDeadline(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-TW" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

// ─── Info Row 元件（圖示 + 標籤 + 值） ───────────────────────────────────────

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0" style={{ color: SECONDARY }}>
        {icon}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm text-gray-700 leading-relaxed">{value}</span>
      </div>
    </div>
  );
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface EventDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { locale, id } = await params;

  // async Server Component 使用 getTranslations
  const t = await getTranslations("events");

  // 查找活動資料；找不到則回傳 404
  const event = getEventById(id);
  if (!event) {
    notFound();
  }

  // 將描述依 \n\n 分段（每段可能是段落文字或以「-」開頭的列表）
  const descParagraphs = event.description
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* ── 頁首 Banner ── */}
      <section
        className="px-4 py-14 sm:py-20"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-4xl mx-auto">
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
            <span
              style={{ color: `${SECONDARY}77` }}
              className="truncate max-w-xs"
            >
              {event.title}
            </span>
          </nav>

          {/* 活動標題 */}
          <h1
            className="text-3xl sm:text-4xl font-bold leading-tight"
            style={{ color: SECONDARY }}
          >
            {event.title}
          </h1>
        </div>
      </section>

      {/* ── 主要內容區 ── */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* 左欄：活動描述（佔 2/3） */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div
              className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2
                className="text-lg font-semibold mb-4"
                style={{ color: PRIMARY }}
              >
                {t("descriptionTitle")}
              </h2>

              {/* 逐段顯示描述 */}
              <div className="flex flex-col gap-4">
                {descParagraphs.map((para, idx) => {
                  // 以「-」開頭的行視為列表
                  if (para.startsWith("-")) {
                    const items = para
                      .split("\n")
                      .map((l) => l.replace(/^-\s*/, "").trim())
                      .filter(Boolean);
                    return (
                      <ul
                        key={idx}
                        className="list-none flex flex-col gap-1.5 pl-2"
                      >
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
                    <p
                      key={idx}
                      className="text-sm text-gray-600 leading-relaxed"
                    >
                      {para}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* 底部導覽按鈕 */}
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/${locale}/events`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
                style={{ borderColor: PRIMARY, color: PRIMARY }}
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                {t("backToList")}
              </Link>

              <Link
                href={`/${locale}/events/calendar`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: PRIMARY, color: SECONDARY }}
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
          </div>

          {/* 右欄：活動資訊側邊欄（1/3） */}
          <aside>
            <div
              className="rounded-2xl bg-white p-6 shadow-sm sticky top-20"
              style={{ border: "1px solid #e5e7eb" }}
            >
              {/* 側邊欄標題 */}
              <div
                className="pb-4 mb-4 border-b"
                style={{ borderColor: "#f3f4f6" }}
              >
                <h3
                  className="text-base font-semibold"
                  style={{ color: PRIMARY }}
                >
                  {t("eventInfo")}
                </h3>
              </div>

              <div className="flex flex-col gap-5">
                {/* 開始時間 */}
                <InfoRow
                  icon={
                    <svg
                      className="w-5 h-5"
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
                  }
                  label={t("startTime")}
                  value={
                    <time dateTime={event.date.toISOString()}>
                      {formatFullDate(event.date, locale)}
                    </time>
                  }
                />

                {/* 結束時間 */}
                <InfoRow
                  icon={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                  label={t("endTime")}
                  value={
                    <time dateTime={event.endDate.toISOString()}>
                      {formatFullDate(event.endDate, locale)}
                    </time>
                  }
                />

                {/* 地點 */}
                <InfoRow
                  icon={
                    <svg
                      className="w-5 h-5"
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
                  }
                  label={t("location")}
                  value={event.location}
                />

                {/* 報名截止日（有值才顯示） */}
                {event.registrationDeadline !== null && (
                  <InfoRow
                    icon={
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    }
                    label={t("registrationDeadline")}
                    value={
                      <time dateTime={event.registrationDeadline.toISOString()}>
                        {formatDeadline(event.registrationDeadline, locale)}
                      </time>
                    }
                  />
                )}

                {/* 名額 */}
                <InfoRow
                  icon={
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  }
                  label={t("capacity")}
                  value={
                    event.capacity !== null
                      ? `${event.capacity} ${t("people")}`
                      : t("noCapacityLimit")
                  }
                />
              </div>

              {/* TODO: 報名按鈕（Module 2.2 活動報名功能完成後啟用） */}
              <div
                className="mt-6 rounded-lg px-4 py-3 text-xs text-center"
                style={{ backgroundColor: "#f3f4f6", color: "#9ca3af" }}
              >
                {t("registrationComingSoon")}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
