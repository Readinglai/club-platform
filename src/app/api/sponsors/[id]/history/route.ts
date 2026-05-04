import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

const VALID_TIERS = ["platinum", "gold", "silver", "bronze"];
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

type Params = { params: Promise<{ id: string }> };

/** GET /api/sponsors/[id]/history — 取得某贊助商的所有歷史記錄 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAuthJson(3, req);
    if (guard.error) return guard.error;

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
    const guard = await requireAuthJson(3, request);
    if (guard.error) return guard.error;

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
