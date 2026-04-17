import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const published = searchParams.get("published");

    const where =
      published === "true" ? { published: true }
      : published === "false" ? { published: false }
      : {};

    const events = await db.event.findMany({
      where,
      orderBy: { startAt: "desc" },
      include: { _count: { select: { registrations: true } } },
    });

    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { title, description, startAt, endAt, location, capacity, published } = body;

    if (!title || !startAt) {
      return NextResponse.json({ error: "title and startAt are required" }, { status: 400 });
    }

    const event = await db.event.create({
      data: {
        title,
        description: description ?? null,
        startAt: new Date(startAt),
        endAt: endAt ? new Date(endAt) : null,
        location: location ?? null,
        capacity: capacity ? Number(capacity) : null,
        published: published ?? false,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
