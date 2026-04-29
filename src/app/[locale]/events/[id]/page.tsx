import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RegistrationStatus } from "@/generated/prisma/client";
import { RegisterPanel } from "./RegisterPanel";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

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

interface EventDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EventDetailPage({
  params,
}: EventDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("events");

  const event = await db.event.findUnique({
    where: { id, published: true },
    include: {
      registrations: {
        where: { status: RegistrationStatus.REGISTERED },
        select: { id: true },
      },
    },
  });

  if (!event) notFound();

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const userRegistration = userId
    ? await db.registration.findUnique({
        where: { userId_eventId: { userId, eventId: id } },
        select: { status: true },
      })
    : null;

  const initialStatus: RegistrationStatus | null =
    userRegistration?.status === RegistrationStatus.CANCELLED
      ? null
      : (userRegistration?.status ?? null);

  const registeredCount = event.registrations.length;
  const remainingSpots =
    event.capacity != null
      ? Math.max(0, event.capacity - registeredCount)
      : null;

  const descParagraphs = (event.description ?? "")
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  const calendarIcon = (
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
  );

  const clockIcon = (
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
  );

  const pinIcon = (
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
  );

  const peopleIcon = (
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
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Banner */}
      <section
        className="relative px-4 py-14 sm:py-20"
        style={
          event.imageUrl
            ? {
                backgroundImage: `url(${event.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { backgroundColor: PRIMARY }
        }
      >
        {event.imageUrl && (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `${PRIMARY}dd` }}
          />
        )}
        <div className="relative max-w-4xl mx-auto">
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

          <h1
            className="text-3xl sm:text-4xl font-bold leading-tight"
            style={{ color: SECONDARY }}
          >
            {event.title}
          </h1>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Description (2/3) */}
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

              {descParagraphs.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {descParagraphs.map((para, idx) => {
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
              ) : (
                <p className="text-sm text-gray-400">{t("noEvents")}</p>
              )}
            </div>

            {/* Nav buttons */}
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

          {/* Sidebar (1/3) */}
          <aside>
            <div
              className="rounded-2xl bg-white p-6 shadow-sm sticky top-20"
              style={{ border: "1px solid #e5e7eb" }}
            >
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
                {/* Start time */}
                <InfoRow
                  icon={calendarIcon}
                  label={t("startTime")}
                  value={
                    <time dateTime={event.startAt.toISOString()}>
                      {formatFullDate(event.startAt, locale)}
                    </time>
                  }
                />

                {/* End time (optional) */}
                {event.endAt && (
                  <InfoRow
                    icon={clockIcon}
                    label={t("endTime")}
                    value={
                      <time dateTime={event.endAt.toISOString()}>
                        {formatFullDate(event.endAt, locale)}
                      </time>
                    }
                  />
                )}

                {/* Location (optional) */}
                {event.location && (
                  <InfoRow
                    icon={pinIcon}
                    label={t("location")}
                    value={event.location}
                  />
                )}

                {/* Capacity */}
                <InfoRow
                  icon={peopleIcon}
                  label={t("capacity")}
                  value={
                    event.capacity !== null
                      ? `${event.capacity} ${t("people")}`
                      : t("noCapacityLimit")
                  }
                />
              </div>

              <RegisterPanel
                eventId={id}
                isLoggedIn={!!userId}
                initialStatus={initialStatus}
                remainingSpots={remainingSpots}
                locale={locale}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
