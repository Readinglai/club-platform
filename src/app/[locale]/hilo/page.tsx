import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicEvent } from "@/lib/events/public";
import { hiloEventId, hiloShowsDrafts } from "@/lib/hilo";
import HiloTickets from "./HiloTickets";

type Props = { params: Promise<{ locale: string }> };

/**
 * Hilo Party's standalone ticket page: English at /hilo, Chinese at /zh/hilo.
 * No login: guests buy, members verify by member ID + card name.
 * Every word on the page comes from messages/{en,zh}.json → hiloPage, so each
 * language is complete on its own; the database only supplies dates and prices.
 */
export default async function HiloPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const eventId = hiloEventId();
  if (!eventId) notFound();
  // Rendered on the server so the tickets are on screen at first paint.
  const data = await getPublicEvent(eventId, null, { allowUnpublished: hiloShowsDrafts() });
  if (!data) notFound();
  return <HiloTickets initial={data} />;
}

/** Title, date and image for link previews (Instagram, WhatsApp, iMessage), in the page's language. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hiloPage.content" });
  const eventId = hiloEventId();
  const data = eventId ? await getPublicEvent(eventId, null, { allowUnpublished: hiloShowsDrafts() }) : null;
  const title = `${t("title")} | ${t("kicker")}`;
  if (!data) return { title };
  const when = new Date(data.event.startAt).toLocaleDateString(locale === "zh" ? "zh-TW" : "en-CA", {
    timeZone: data.event.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return {
    title,
    description: `${when}, ${t("venue")}`,
    alternates: { languages: { en: "/hilo", "zh-Hant": "/zh/hilo" } },
    openGraph: { title, images: data.event.imageUrl ? [data.event.imageUrl] : undefined },
  };
}
