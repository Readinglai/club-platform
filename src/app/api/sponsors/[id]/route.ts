import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

type Params = { params: Promise<{ id: string }> };

/** GET /api/sponsors/[id] — 取得單一贊助商（含所有 histories） */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAuthJson(3, req);
    if (guard.error) return guard.error;

    const { id } = await params;
    const sponsor = await db.sponsor.findUnique({
      where: { id },
      include: { histories: { orderBy: { year: "desc" } } },
    });

    if (!sponsor) return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
    return NextResponse.json(sponsor);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/sponsors/[id] — 更新贊助商基本資料 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const guard = await requireAuthJson(3, request);
    if (guard.error) return guard.error;

    const { id } = await params;
    const body = await request.json();
    const { name, logoUrl, website, description } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }

    const sponsor = await db.sponsor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(website !== undefined && { website: website || null }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    return NextResponse.json(sponsor);
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/sponsors/[id] — 刪除贊助商（histories cascade 刪除） */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const guard = await requireAuthJson(3, req);
    if (guard.error) return guard.error;

    const { id } = await params;
    await db.sponsor.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
