import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const event = await db.event.findUnique({
      where: { id },
      include: {
        registrations: {
          orderBy: { createdAt: "asc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { registrations: true } },
      },
    });

    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (sessionUser.roleLevel < 3) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { title, description, startAt, endAt, location, capacity, published, imageUrl } = body;

    const event = await db.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(startAt !== undefined && { startAt: new Date(startAt) }),
        ...(endAt !== undefined && { endAt: endAt ? new Date(endAt) : null }),
        ...(location !== undefined && { location }),
        ...(capacity !== undefined && { capacity: capacity ? Number(capacity) : null }),
        ...(published !== undefined && { published }),
        ...(imageUrl !== undefined && {
          imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
        }),
      },
    });

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (sessionUser.roleLevel < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await db.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
