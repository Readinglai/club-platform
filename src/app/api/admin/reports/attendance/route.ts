import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const events = await db.event.findMany({
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        title: true,
        startAt: true,
        registrations: {
          select: { attendedAt: true, status: true },
        },
      },
    });

    const result = events.map((e) => {
      // Denominator: only REGISTERED (confirmed spots). WAITLISTED/CANCELLED excluded.
      const registered = e.registrations.filter((r) => r.status === "REGISTERED");
      const total = registered.length;
      const attended = registered.filter((r) => r.attendedAt !== null).length;
      return {
        eventId: e.id,
        title: e.title,
        startAt: e.startAt.toISOString(),
        totalRegistrations: total,
        attended,
        attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
      };
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
