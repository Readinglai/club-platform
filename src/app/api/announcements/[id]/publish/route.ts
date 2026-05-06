import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";
import { sendPushNotification } from "@/lib/webpush";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/announcements/[id]/publish — 切換發布狀態（EXEC+） */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 3) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { published } = body;

    if (typeof published !== "boolean") {
      return NextResponse.json({ error: "published 必須為 boolean" }, { status: 400 });
    }

    const announcement = await db.announcement.update({
      where: { id },
      data: { published },
    });

    // Send push notifications to all subscribers when publishing
    console.log("[PUSH DEBUG] published value:", published, typeof published);
    if (published) {
      const subscriptions = await db.pushSubscription.findMany();
      console.log("[PUSH DEBUG] sending to subscriptions count:", subscriptions.length);
      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          sendPushNotification(sub, {
            title: "新公告",
            body: announcement.title,
            url: "/portal/announcements",
            data: { type: "announcement", announcementId: announcement.id },
          })
        )
      );
      console.log("[PUSH DEBUG] push sent result:", results);
    }

    return NextResponse.json(announcement);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
