/** POST /api/team/members — { groupId, email, position } adds or updates someone's position. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { addToGroup } from "@/lib/access/team";
import type { GroupPosition } from "@/generated/prisma/client";

const POSITIONS: GroupPosition[] = ["PRESIDENT", "VP", "STAFF"];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const position = POSITIONS.includes(body.position) ? (body.position as GroupPosition) : null;
  if (typeof body.groupId !== "string" || typeof body.email !== "string" || !position) {
    return NextResponse.json({ error: "groupId, email and position are required." }, { status: 400 });
  }

  const result = await addToGroup({ actorId: user.id, groupId: body.groupId, email: body.email, position });
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
