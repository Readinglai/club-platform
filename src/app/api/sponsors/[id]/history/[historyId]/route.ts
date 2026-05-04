import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

type Params = { params: Promise<{ id: string; historyId: string }> };

/** DELETE /api/sponsors/[id]/history/[historyId] — 刪除某筆贊助歷史記錄 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAuthJson(3, req);
    if (guard.error) return guard.error;

    const { id, historyId } = await params;

    const history = await db.sponsorHistory.findUnique({
      where: { id: historyId },
    });

    if (!history) {
      return NextResponse.json({ error: "History record not found" }, { status: 404 });
    }

    if (history.sponsorId !== id) {
      return NextResponse.json({ error: "History record does not belong to this sponsor" }, { status: 400 });
    }

    await db.sponsorHistory.delete({ where: { id: historyId } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
