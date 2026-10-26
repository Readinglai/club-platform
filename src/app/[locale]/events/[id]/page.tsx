import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { HALLOWEEN_2026_EVENT_ID } from "@/lib/events/legacy";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

/**
 * A public event's info page. The sign-up button links to the ticket page
 * (/e/[id]) only for upcoming events with tickets switched on; otherwise it
 * stays visible, greyed out. The 2026 Halloween party keeps its own page.
 */
export default async function EventInfoPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (id === HALLOWEEN_2026_EVENT_ID) redirect(locale === "en" ? "/event/fall-2026" : `/${locale}/event/fall-2026`);

  const event = await db.event.findFirst({
    where: { id, published: true },
    select: {
      title: true,
      description: true,
      location: true,
      imageUrl: true,
      startAt: true,
      endAt: true,
      settings: { select: { timezone: true, ticketsEnabled: true } },
      _count: { select: { ticketTypes: { where: { active: true } } } },
    },
  });
  if (!event) notFound();

  const t = await getTranslations("events");
  const tz = event.settings?.timezone ?? "America/Toronto";
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";
  const date = event.startAt.toLocaleDateString(dateLocale, { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString(dateLocale, { timeZone: tz, hour: "numeric", minute: "2-digit" });
  const over = (event.endAt ?? event.startAt) < new Date();
  const canSignUp = !over && Boolean(event.settings?.ticketsEnabled) && event._count.ticketTypes > 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <section className="px-4 py-14 sm:py-20" style={{ backgroundColor: PRIMARY }}>
        <div className="mx-auto max-w-3xl">
          <Link href={`/${locale}/events`} className="text-sm hover:opacity-70" style={{ color: `${SECONDARY}99` }}>
            ← {t("backToList")}
          </Link>
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-5xl" style={{ color: SECONDARY }}>{event.title}</h1>
          <p className="mt-4 text-base" style={{ color: "#ffffffcc" }}>
            {date} · {time(event.startAt)}
            {event.endAt ? `–${time(event.endAt)}` : ""}
          </p>
          {event.location && <p className="mt-1 text-base" style={{ color: "#ffffffaa" }}>{event.location}</p>}

          <div className="mt-8">
            {canSignUp ? (
              <Link href={`/e/${id}`} className="inline-flex min-h-12 items-center rounded-xl px-6 text-base font-semibold" style={{ backgroundColor: SECONDARY, color: PRIMARY }}>
                {t("getTickets")}
              </Link>
            ) : (
              <span aria-disabled="true" className="inline-flex min-h-12 cursor-not-allowed items-center rounded-xl px-6 text-base font-semibold" style={{ backgroundColor: "#d1d5db", color: "#4b5563" }}>
                {t("signupUnavailable")}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
        {event.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- organiser-provided link from any host
          <img src={event.imageUrl} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />
        )}
        {event.description && (
          <section>
            <h2 className="text-xl font-bold" style={{ color: PRIMARY }}>{t("descriptionTitle")}</h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-gray-800">{event.description}</p>
          </section>
        )}
      </div>
    </div>
  );
}
