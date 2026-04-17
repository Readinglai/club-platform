import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const type = new URL(request.url).searchParams.get("type");

    if (type === "attendance") {
      const events = await db.event.findMany({
        orderBy: { startAt: "desc" },
        select: {
          title: true,
          startAt: true,
          registrations: { select: { attendedAt: true, status: true } },
        },
      });

      const rows = events.map((e) => {
        const registered = e.registrations.filter((r) => r.status === "REGISTERED");
        const total = registered.length;
        const attended = registered.filter((r) => r.attendedAt !== null).length;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
        return `"${e.title}","${e.startAt.toLocaleDateString("zh-TW")}",${total},${attended},${rate}%`;
      });

      const csv = ["活動名稱,日期,報名人數,出席人數,出席率", ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="attendance.csv"',
        },
      });
    }

    if (type === "members") {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      since.setDate(1);
      since.setHours(0, 0, 0, 0);

      const users = await db.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      });

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

      const rows = Array.from(buckets.entries()).map(([m, c]) => `${m},${c}`);
      const csv = ["月份,新增成員數", ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="members.csv"',
        },
      });
    }

    return NextResponse.json({ error: "type 參數必須為 attendance 或 members" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
