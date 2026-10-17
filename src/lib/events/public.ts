/**
 * What the public event page shows: details, tiers with availability, and —
 * for a signed-in visitor — their member status and pre-filled details.
 * Unpublished events are only visible to the people who manage them.
 */

import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/membership/purchase";
import { CHECKOUT_HOLD_MINUTES } from "@/lib/ticketing/orders";
import { canManageEvent } from "./manage";

export type TierState = "on_sale" | "sold_out" | "not_started" | "ended";

export async function getPublicEvent(eventId: string, viewerId: string | null) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      imageUrl: true,
      startAt: true,
      endAt: true,
      published: true,
      settings: { select: { timezone: true, currency: true, ticketsEnabled: true } },
      ticketTypes: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!event) return null;

  const manager = viewerId ? await canManageEvent(viewerId, eventId) : false;
  if (!event.published && !manager) return null;

  const now = new Date();
  const holdCutoff = new Date(now.getTime() - CHECKOUT_HOLD_MINUTES * 60_000);
  const taken = await db.ticket.groupBy({
    by: ["ticketTypeId"],
    where: {
      eventId,
      OR: [{ status: "VALID" }, { status: "RESERVED", order: { status: "PENDING", createdAt: { gt: holdCutoff } } }],
    },
    _count: true,
  });
  const takenByType = new Map(taken.map((t) => [t.ticketTypeId, t._count]));

  let viewer = null;
  if (viewerId) {
    const [user, membership, memberTickets] = await Promise.all([
      db.user.findUnique({ where: { id: viewerId }, select: { name: true, email: true, profile: { select: { phone: true } } } }),
      getCurrentMembership(viewerId),
      db.ticket.count({ where: { eventId, userId: viewerId, memberPricing: true, status: { in: ["VALID", "RESERVED"] } } }),
    ]);
    viewer = {
      isMember: Boolean(membership),
      memberPriceUsed: memberTickets > 0,
      prefill: { name: user?.name ?? "", email: user?.email ?? "", phone: user?.profile?.phone ?? "" },
    };
  }

  const tiers = event.ticketTypes.map((t) => {
    const remaining = t.capacity === null ? null : Math.max(0, t.capacity - (takenByType.get(t.id) ?? 0));
    const state: TierState =
      t.salesStartAt && now < t.salesStartAt
        ? "not_started"
        : t.salesEndAt && now > t.salesEndAt
          ? "ended"
          : remaining === 0
            ? "sold_out"
            : "on_sale";
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      perks: t.perks,
      color: t.color,
      price: t.price.toNumber(),
      memberPrice: t.memberPrice?.toNumber() ?? null,
      membersOnly: t.membersOnly,
      remaining,
      salesStartAt: t.salesStartAt?.toISOString() ?? null,
      state,
    };
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      imageUrl: event.imageUrl,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt?.toISOString() ?? null,
      timezone: event.settings?.timezone ?? "America/Toronto",
      currency: event.settings?.currency ?? "CAD",
      published: event.published,
      ticketsEnabled: Boolean(event.settings?.ticketsEnabled),
    },
    tiers,
    viewer,
    preview: !event.published,
  };
}
