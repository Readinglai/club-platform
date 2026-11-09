import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicEvent } from "@/lib/events/public";
import { hiloEventId, hiloShowsDrafts } from "@/lib/hilo";
import HiloTickets from "./HiloTickets";

/** Hilo Party's standalone ticket page. No login: guests buy, members verify by member ID + card name. */
export default async function HiloPage() {
  const eventId = hiloEventId();
  if (!eventId) notFound();
  // Rendered on the server so the tickets are on screen at first paint.
  const data = await getPublicEvent(eventId, null, { allowUnpublished: hiloShowsDrafts() });
  if (!data) notFound();
  return <HiloTickets initial={data} />;
}

/** Title, date and image for link previews (Instagram, WhatsApp, iMessage). */
export async function generateMetadata(): Promise<Metadata> {
  const eventId = hiloEventId();
  const data = eventId ? await getPublicEvent(eventId, null, { allowUnpublished: hiloShowsDrafts() }) : null;
  if (!data) return { title: "Hilo Party" };
  const when = new Date(data.event.startAt).toLocaleDateString("en-CA", {
    timeZone: data.event.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return {
    title: data.event.title,
    description: [when, data.event.location].filter(Boolean).join(", "),
    openGraph: { title: data.event.title, images: data.event.imageUrl ? [data.event.imageUrl] : undefined },
  };
}
