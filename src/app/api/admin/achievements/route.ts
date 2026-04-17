import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

/** GET /api/admin/achievements — 列出所有成果，可用 ?year=2024 篩選 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const achievements = await db.achievement.findMany({
      where: year ? { year } : undefined,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(achievements);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/admin/achievements — 建立新成果 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { title, year, description, imageUrl } = body;

    if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
    if (!year || typeof year !== "number" || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "year must be a valid integer" }, { status: 400 });
    }
    if (!description?.trim()) return NextResponse.json({ error: "description is required" }, { status: 400 });

    const achievement = await db.achievement.create({
      data: {
        title: title.trim(),
        year,
        description: description.trim(),
        imageUrl: imageUrl?.trim() || null,
      },
    });

    return NextResponse.json(achievement, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
