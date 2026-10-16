/** GET /api/club/members/[id] — one member: profile, memberships, positions, tickets. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { forbidUnless } from "@/lib/access/require";
import { getMemberDetail } from "@/lib/membership/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const forbidden = await forbidUnless(user.id, "members.view");
  if (forbidden) return forbidden;

  const detail = await getMemberDetail((await params).id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
}
