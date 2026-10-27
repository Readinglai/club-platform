/**
 * Live numbers for an event: sold vs capacity, checked in, revenue — per tier.
 * Visible to the event's team (events.checkin), the Events VP and the President.
 */

import { db } from "@/lib/db";
import { can, getAccess, type Access } from "@/lib/access/can";
import { CHECKOUT_HOLD_MINUTES } from "@/lib/ticketing/orders";

export async function canSeeDashboard(userId: string, eventId: string) {
  const group = await db.group.findUnique({ where: { eventId }, select: { id: true } });
  return canSeeEventTeamDashboard(await getAccess(userId), group?.id ?? null);
}

/** canSeeDashboard for an already loaded access and the event's team group id. */
export function canSeeEventTeamDashboard(access: Access, teamId: string | null) {
  if (!teamId) return access.globalGrants.has("*");
  return can(access, "events.checkin", { groupId: teamId }) || can(access, "events.manage", { groupId: teamId });
}

export async function getEventDashboard(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      startAt: true,
      settings: { select: { timezone: true, currency: true } },
      ticketTypes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true, capacity: true, color: true, active: true } },
    },
  });
  if (!event) return null;

  const holdCutoff = new Date(Date.now() - CHECKOUT_HOLD_MINUTES * 60_000);
  const tickets = await db.ticket.findMany({
    where: {
      eventId,
      OR: [{ status: "VALID" }, { status: "RESERVED", order: { status: "PENDING", createdAt: { gt: holdCutoff } } }],
    },
    select: { ticketTypeId: true, status: true, pricePaid: true, checkedInAt: true, holderName: true },
  });

  const tiers = event.ticketTypes.map((t) => {
    const mine = tickets.filter((x) => x.ticketTypeId === t.id);
    const sold = mine.filter((x) => x.status === "VALID");
    return {
      id: t.id,
      name: t.name,
      color: t.color,
      active: t.active,
      capacity: t.capacity,
      sold: sold.length,
      held: mine.length - sold.length,
      checkedIn: sold.filter((x) => x.checkedInAt).length,
      revenue: sold.reduce((sum, x) => sum + x.pricePaid.toNumber(), 0),
    };
  });

  const recentCheckIns = tickets
    .filter((x) => x.checkedInAt)
    .sort((a, b) => b.checkedInAt!.getTime() - a.checkedInAt!.getTime())
    .slice(0, 8)
    .map((x) => ({
      name: x.holderName,
      tier: event.ticketTypes.find((t) => t.id === x.ticketTypeId)?.name ?? "",
      at: x.checkedInAt!.toISOString(),
    }));

  return {
    event: { id: event.id, title: event.title, startAt: event.startAt.toISOString(), timezone: event.settings?.timezone ?? "America/Toronto" },
    totals: {
      sold: tiers.reduce((s, t) => s + t.sold, 0),
      held: tiers.reduce((s, t) => s + t.held, 0),
      checkedIn: tiers.reduce((s, t) => s + t.checkedIn, 0),
      revenue: tiers.reduce((s, t) => s + t.revenue, 0),
      capacity: tiers.every((t) => t.capacity !== null) ? tiers.reduce((s, t) => s + (t.capacity ?? 0), 0) : null,
    },
    tiers,
    recentCheckIns,
    updatedAt: new Date().toISOString(),
  };
}
