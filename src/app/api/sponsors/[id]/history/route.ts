import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

const VALID_TIERS = ["platinum", "gold", "silver", "bronze"];
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

type Params = { params: Promise<{ id: string }> };

/** GET /api/sponsors/[id]/history — 取得某贊助商的所有歷史記錄 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 3) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const sponsor = await db.sponsor.findUnique({ where: { id } });
    if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

    const histories = await db.sponsorHistory.findMany({
      where: { sponsorId: id },
      orderBy: { year: "desc" },
    });

    return NextResponse.json(histories);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/sponsors/[id]/history — 新增某年的贊助記錄 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 3) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    const sponsor = await db.sponsor.findUnique({ where: { id } });
    if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });

    const body = await request.json();
    const { year, tier } = body;

    const yearNum = parseInt(String(year), 10);
    if (isNaN(yearNum) || yearNum < YEAR_MIN || yearNum > YEAR_MAX) {
      return NextResponse.json(
        { error: `year must be an integer between ${YEAR_MIN} and ${YEAR_MAX}` },
        { status: 400 }
      );
    }

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        { error: `tier must be one of: ${VALID_TIERS.join(", ")}` },
        { status: 400 }
      );
    }

    // 檢查同一 sponsor 同年是否已有記錄（給出比 DB unique 錯誤更清楚的訊息）
    const existing = await db.sponsorHistory.findUnique({
      where: { sponsorId_year: { sponsorId: id, year: yearNum } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A history record for year ${yearNum} already exists for this sponsor` },
        { status: 409 }
      );
    }

    const history = await db.sponsorHistory.create({
      data: { sponsorId: id, year: yearNum, tier },
    });

    return NextResponse.json(history, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
