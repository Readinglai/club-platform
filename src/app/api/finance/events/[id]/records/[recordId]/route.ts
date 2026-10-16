/** DELETE /api/finance/events/[id]/records/[recordId] */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { removeEventRecord } from "@/lib/finance/entries";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; recordId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, recordId } = await params;
  const result = await removeEventRecord(user.id, id, recordId);
  return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.message }, { status: result.status });
}
