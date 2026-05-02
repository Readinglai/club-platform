import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

/** GET /api/admin/achievements/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (sessionUser.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const achievement = await db.achievement.findUnique({ where: { id } });
    if (!achievement) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(achievement);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH /api/admin/achievements/[id] */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (sessionUser.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { title, year, description, imageUrl } = body;

    if (title !== undefined && !title?.trim()) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    if (year !== undefined && (typeof year !== "number" || year < 2000 || year > 2100)) {
      return NextResponse.json({ error: "year must be a valid integer" }, { status: 400 });
    }

    const achievement = await db.achievement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(year !== undefined && { year }),
        ...(description !== undefined && { description: description.trim() }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
      },
    });

    return NextResponse.json(achievement);
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE /api/admin/achievements/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (sessionUser.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await db.achievement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    if ((err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
