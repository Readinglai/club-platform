import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (sessionUser.roleLevel < 3) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { published } = body;

    if (typeof published !== "boolean") {
      return NextResponse.json({ error: "published must be boolean" }, { status: 400 });
    }

    const event = await db.event.update({
      where: { id },
      data: { published },
    });

    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
