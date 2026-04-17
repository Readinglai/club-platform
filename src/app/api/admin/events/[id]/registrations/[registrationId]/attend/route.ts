import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string; registrationId: string }> };

/**
 * PATCH /api/admin/events/[id]/registrations/[registrationId]/attend
 * Toggle attendedAt for a registration.
 * Body: { attended: boolean }
 * Requires EXEC+ role.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { registrationId } = await params;
    const body = await request.json();

    if (typeof body.attended !== "boolean") {
      return NextResponse.json({ error: "attended must be boolean" }, { status: 400 });
    }

    const registration = await db.registration.update({
      where: { id: registrationId },
      data: { attendedAt: body.attended ? new Date() : null },
    });

    return NextResponse.json(registration);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
