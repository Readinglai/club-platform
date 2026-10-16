/** POST /api/team/groups/[id]/archive — archive a subgroup (groups are never deleted). */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { archiveGroup } from "@/lib/access/team";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await archiveGroup({ actorId: user.id, groupId: id });
  return result.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
