/**
 * Every ticket that belongs to a person: tickets linked to their account,
 * tickets bought with their email while logged out, and Halloween 2026
 * tickets from the old EventTicket table (read only).
 */

import { db } from "@/lib/db";

export type MyTicket = {
  token: string;
  eventTitle: string;
  startAt: string;
  endAt: string | null;
  timezone: string;
  location: string | null;
  tier: string;
  holderName: string;
  status: "valid" | "void";
  checkedInAt: string | null;
};

export async function getMyTickets(userId: string, email: string): Promise<MyTicket[]> {
  const sameEmail = { equals: email.trim(), mode: "insensitive" as const };

  const [tickets, legacy] = await Promise.all([
    db.ticket.findMany({
      where: {
        status: { in: ["VALID", "VOID"] },
        OR: [{ userId }, { holderEmail: sameEmail }, { order: { buyerEmail: sameEmail } }],
      },
      select: {
        token: true,
        status: true,
        holderName: true,
        checkedInAt: true,
        ticketType: { select: { name: true } },
        event: { select: { title: true, startAt: true, endAt: true, location: true, settings: { select: { timezone: true } } } },
      },
    }),
    db.eventTicket.findMany({
      where: { email: sameEmail },
      select: {
        token: true,
        status: true,
        name: true,
        tier: true,
        checkedInAt: true,
        event: { select: { title: true, startAt: true, endAt: true, location: true } },
      },
    }),
  ]);

  const all: MyTicket[] = [
    ...tickets.map((t) => ({
      token: t.token,
      eventTitle: t.event.title,
      startAt: t.event.startAt.toISOString(),
      endAt: t.event.endAt?.toISOString() ?? null,
      timezone: t.event.settings?.timezone ?? "America/Toronto",
      location: t.event.location,
      tier: t.ticketType.name,
      holderName: t.holderName,
      status: t.status === "VALID" ? ("valid" as const) : ("void" as const),
      checkedInAt: t.checkedInAt?.toISOString() ?? null,
    })),
    ...legacy.map((t) => ({
      token: t.token,
      eventTitle: t.event.title,
      startAt: t.event.startAt.toISOString(),
      endAt: t.event.endAt?.toISOString() ?? null,
      timezone: "America/Toronto",
      location: t.event.location,
      tier: t.tier.charAt(0) + t.tier.slice(1).toLowerCase(),
      holderName: t.name,
      status: t.status === "void" ? ("void" as const) : ("valid" as const),
      checkedInAt: t.checkedInAt?.toISOString() ?? null,
    })),
  ];

  // Upcoming first (soonest first), then past (most recent first).
  const now = Date.now();
  const ends = (t: MyTicket) => new Date(t.endAt ?? t.startAt).getTime();
  return all.sort((a, b) => {
    const aPast = ends(a) < now;
    const bPast = ends(b) < now;
    if (aPast !== bPast) return aPast ? 1 : -1;
    const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    return aPast ? -diff : diff;
  });
}

/** Splits tickets into upcoming and past (an event is past once it has ended). */
export function splitByTime(tickets: MyTicket[], now = Date.now()) {
  const isPast = (t: MyTicket) => new Date(t.endAt ?? t.startAt).getTime() < now;
  return { upcoming: tickets.filter((t) => !isPast(t)), past: tickets.filter(isPast) };
}
