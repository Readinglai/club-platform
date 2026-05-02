import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (sessionUser.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    // 最近 12 個月的起始點
    const since = new Date();
    since.setMonth(since.getMonth() - 11);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const users = await db.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // 建立 12 個月的 bucket map
    const buckets = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, 0);
    }

    for (const u of users) {
      const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    const result = Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
