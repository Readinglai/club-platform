/**
 * GET /api/club/team-page — the public Members page's people, hidden ones included.
 * PUT /api/club/team-page { people: { [userId]: { hidden, order, title, bio } } } — save.
 * Operations VP, the Website group under Operations, and the President.
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermissionJson } from "@/lib/access/require";
import { getPublicTeam, saveTeamPage } from "@/lib/team/public";

export async function GET() {
  const guard = await requirePermissionJson("showcase.manage");
  if (guard.error) return guard.error;
  return NextResponse.json({ departments: await getPublicTeam({ includeHidden: true }) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const guard = await requirePermissionJson("showcase.manage");
  if (guard.error) return guard.error;
  const body = await request.json().catch(() => ({}));
  const result = await saveTeamPage(guard.userId, body.people);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
