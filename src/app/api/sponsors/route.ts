import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

const VALID_TIERS = ["platinum", "gold", "silver", "bronze"] as const;

/** GET /api/sponsors — 列出所有贊助商，可用 ?year=2024 篩選有該年度記錄的 sponsor */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : null;

    const sponsors = await db.sponsor.findMany({
      where: year
        ? { histories: { some: { year } } }
        : undefined,
      orderBy: { name: "asc" },
      include: {
        histories: {
          orderBy: { year: "desc" },
        },
      },
    });

    return NextResponse.json(sponsors);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST /api/sponsors — 新增贊助商 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { name, logoUrl, website, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const sponsor = await db.sponsor.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl ?? null,
        website: website ?? null,
        description: description ?? null,
      },
    });

    return NextResponse.json(sponsor, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
