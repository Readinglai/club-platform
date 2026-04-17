import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

/** GET /api/sponsors/[id] — 取得單一贊助商（含所有 histories） */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/sponsors/[id] — 刪除贊助商（histories cascade 刪除） */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await db.sponsor.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
