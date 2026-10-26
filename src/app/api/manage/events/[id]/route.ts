/**
 * GET   /api/manage/events/[id] — details for editing (times in the event's zone) and tiers.
 * PATCH  /api/manage/events/[id] — update details and modules.
 * DELETE /api/manage/events/[id] — delete the event (Events VP, President).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access/current-user";
import { canDeleteEvent, canManageEvent, deleteEvent, updateEvent } from "@/lib/events/manage";
import { dateToZonedInput } from "@/lib/events/time";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await canManageEvent(user.id, id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const event = await db.event.findUnique({
    where: { id },
    include: { settings: true, ticketTypes: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const canDelete = await canDeleteEvent(user.id, id);
  const tz = event.settings?.timezone ?? "America/Toronto";
  const local = (d: Date | null) => (d ? dateToZonedInput(d, tz) : "");
  return NextResponse.json(
    {
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      location: event.location ?? "",
      imageUrl: event.imageUrl ?? "",
      startAt: local(event.startAt),
      endAt: local(event.endAt),
      timezone: tz,
      published: event.published,
      canDelete,
      ticketsEnabled: Boolean(event.settings?.ticketsEnabled),
      checkInEnabled: Boolean(event.settings?.checkInEnabled),
      budgetEnabled: Boolean(event.settings?.budgetEnabled),
      dashboardEnabled: Boolean(event.settings?.dashboardEnabled),
      ticketTypes: event.ticketTypes.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? "",
        price: t.price.toNumber(),
        memberPrice: t.memberPrice?.toNumber() ?? null,
        capacity: t.capacity,
        salesStartAt: local(t.salesStartAt),
        salesEndAt: local(t.salesEndAt),
        membersOnly: t.membersOnly,
        color: t.color ?? "",
        perks: t.perks ?? "",
        sortOrder: t.sortOrder,
        active: t.active,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await updateEvent(user.id, id, await request.json().catch(() => ({})));
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const result = await deleteEvent(user.id, id);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
