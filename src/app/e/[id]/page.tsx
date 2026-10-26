import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/access/current-user";
import { db } from "@/lib/db";
import { getPublicEvent } from "@/lib/events/public";
import EventTickets from "./EventTickets";

type Props = { params: Promise<{ id: string }> };

/** Public ticket page for events after Halloween 2026 (readable /events/<slug> URLs come later). */
export default async function PublicEventPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  // Rendered on the server so the tickets are on screen at first paint.
  const data = await getPublicEvent(id, user?.id ?? null);
  if (!data) notFound();
  return <EventTickets eventId={id} initial={data} />;
}

/** Title and date for link previews (Instagram, WhatsApp, iMessage); public events only. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await db.event.findUnique({
    where: { id: (await params).id },
    select: { title: true, startAt: true, location: true, imageUrl: true, published: true, settings: { select: { timezone: true } } },
  });
  if (!event?.published) return { title: "ROCSAUT" };
  const when = event.startAt.toLocaleDateString("en-CA", {
    timeZone: event.settings?.timezone ?? "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return {
    title: `${event.title} · ROCSAUT`,
    description: [when, event.location].filter(Boolean).join(", "),
    openGraph: { title: event.title, images: event.imageUrl ? [event.imageUrl] : undefined },
  };
}
