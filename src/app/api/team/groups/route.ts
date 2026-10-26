/** POST /api/team/groups — { parentId, name } creates a subgroup. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { createSubgroup } from "@/lib/access/team";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.parentId !== "string" || typeof body.name !== "string") {
    return NextResponse.json({ error: "parentId and name are required." }, { status: 400 });
  }

  const result = await createSubgroup({ actorId: user.id, parentId: body.parentId, name: body.name });
  return result.ok
    ? NextResponse.json({ ok: true, id: result.value })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
