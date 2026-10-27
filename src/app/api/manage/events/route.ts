/**
 * GET  /api/manage/events — events the signed-in person can manage or work on.
 * POST /api/manage/events — create an event (Events VP, President).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access/current-user";
import { can, getAccess } from "@/lib/access/can";
import { canManageEventTeam, createEvent } from "@/lib/events/manage";
import { canSeeEventTeamDashboard } from "@/lib/events/dashboard";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // One access lookup for the whole list; each event is then checked in memory.
  const [events, access] = await Promise.all([
    db.event.findMany({
      where: { team: { isNot: null } },
      orderBy: { startAt: "desc" },
      select: { id: true, title: true, startAt: true, published: true, settings: { select: { timezone: true } }, team: { select: { id: true } } },
    }),
    getAccess(user.id),
  ]);

  const visible = [];
  for (const { team, ...e } of events) {
    const teamId = team?.id ?? null;
    const manage = canManageEventTeam(access, teamId);
    if (manage || canSeeEventTeamDashboard(access, teamId)) visible.push({ ...e, canManage: manage });
  }

  return NextResponse.json(
    { events: visible, canCreate: can(access, "events.create") },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await createEvent(user.id, await request.json().catch(() => ({})));
  return result.ok
    ? NextResponse.json({ ok: true, id: result.value }, { status: 201 })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
