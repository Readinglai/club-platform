/** GET /api/work/groups/[groupId] — the group's tasks, discussion and votes. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getGroupBoard } from "@/lib/tasks/tasks";

export async function GET(_request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupId } = await params;
  const board = await getGroupBoard(user.id, groupId);
  return board
    ? NextResponse.json(board, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
