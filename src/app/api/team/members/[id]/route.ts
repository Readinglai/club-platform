/** DELETE /api/team/members/[id] — take someone out of a group. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { removeFromGroup } from "@/lib/access/team";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await removeFromGroup({ actorId: user.id, memberId: id });
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
