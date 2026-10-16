/** POST /api/club/members/import { csv, apply } — check (apply false) or add "name,email" rows. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { importMembers } from "@/lib/membership/admin";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const csv = typeof body.csv === "string" ? body.csv : "";
  const result = await importMembers(user.id, csv, body.apply === true);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ results: result.results });
}
