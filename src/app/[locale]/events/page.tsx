import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

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

type TFn = (key: string, values?: Record<string, unknown>) => string;

type DbEvent = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startAt: Date;
  location: string | null;
  capacity: number | null;
};

interface EventCardProps {
  event: DbEvent;
  locale: string;
  t: TFn;
}

function EventCard({ event, locale, t }: EventCardProps) {
  const href = `/${locale}/events/${event.id}`;
  const desc = event.description ?? "";
  const shortDesc = desc.replace(/\n/g, " ").slice(0, 120);
  const isDescTruncated = desc.replace(/\n/g, " ").length > 120;

  return (
    <article
      className="group flex flex-col rounded-2xl border overflow-hidden transition-shadow duration-200 hover:shadow-lg"
      style={{ borderColor: "#e5e7eb" }}
    >
      {event.imageUrl ? (
        <div className="h-44 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-1.5" style={{ backgroundColor: PRIMARY }} />
      )}

      <div className="flex flex-col gap-4 p-6">
        {/* Date */}
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
            dateTime={event.startAt.toISOString()}
            className="text-sm font-medium"
            style={{ color: SECONDARY }}
          >
            {formatEventDate(event.startAt, locale)}
          </time>
        </div>

        {/* Title */}
        <h2
          className="text-xl font-bold leading-snug group-hover:opacity-80 transition-opacity"
          style={{ color: PRIMARY }}
        >
          {event.title}
        </h2>

        {/* Location */}
        {event.location && (
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
        )}

        {/* Description */}
        {desc && (
          <p className="text-sm text-gray-600 leading-relaxed flex-1">
            {shortDesc}
            {isDescTruncated && "…"}
          </p>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-2 border-t"
          style={{ borderColor: "#f3f4f6" }}
        >
          {event.capacity !== null ? (
            <span className="text-xs text-gray-400">
              {t("capacity")}: {event.capacity}
            </span>
          ) : (
            <span className="text-xs text-gray-400">{t("noCapacityLimit")}</span>
          )}
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

interface EventsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function EventsPage({ params }: EventsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("events");
  const events = await db.event.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      description: true,
      imageUrl: true,
      startAt: true,
      location: true,
      capacity: true,
    },
    orderBy: { startAt: "asc" },
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Banner */}
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

      {/* Cards */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {events.length === 0 ? (
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
