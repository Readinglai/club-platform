import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string; historyId: string }> };

/** DELETE /api/sponsors/[id]/history/[historyId] — 刪除某筆贊助歷史記錄 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 3) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, historyId } = await params;

    // 確認 history 存在且屬於正確的 sponsor
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
