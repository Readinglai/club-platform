import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { HALLOWEEN_2026_EVENT_ID } from "@/lib/events/legacy";
import { getEventMemories } from "@/lib/events/memories";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

/**
 * A public event's detail page ("Read more" on the Events page): the event's
 * info and, once added, its past memories. Signing up is its own button on the
 * Events page. The 2026 Halloween party used its own page until it was over.
 */
export default async function EventInfoPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const event = await db.event.findFirst({
    where: { id, published: true },
    select: {
      title: true,
      description: true,
      location: true,
      imageUrl: true,
      startAt: true,
      endAt: true,
      settings: { select: { timezone: true } },
    },
  });
  if (!event) notFound();
  // Before it happened, the 2026 Halloween party's page was its own ticket page.
  if (id === HALLOWEEN_2026_EVENT_ID && (event.endAt ?? event.startAt) > new Date()) {
    redirect(locale === "en" ? "/event/fall-2026" : `/${locale}/event/fall-2026`);
  }

  const [t, memories] = await Promise.all([getTranslations("events"), getEventMemories(id)]);
  const tz = event.settings?.timezone ?? "America/Toronto";
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";
  const date = event.startAt.toLocaleDateString(dateLocale, { timeZone: tz, weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const time = (d: Date) => d.toLocaleTimeString(dateLocale, { timeZone: tz, hour: "numeric", minute: "2-digit" });

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

        {(memories.recap || memories.photos.length > 0) && (
          <section aria-labelledby="memories-title">
            <h2 id="memories-title" className="text-xl font-bold" style={{ color: PRIMARY }}>{t("pastMemories")}</h2>
            {memories.recap && <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-gray-800">{memories.recap}</p>}
            {memories.photos.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {memories.photos.map((photo) => (
                  <figure key={photo.id} className="flex flex-col gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element -- uploaded to the club's storage */}
                    <img src={photo.imageUrl} alt={photo.caption ?? ""} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                    {photo.caption && <figcaption className="text-xs text-gray-600">{photo.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
