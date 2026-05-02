/**
 * /api/events/[id]
 *
 * 公開活動詳情 API，不需登入即可讀取已發布活動的基本資訊。
 *
 * GET — 取得單一活動的詳細資訊。
 *       若攜帶有效的 cookie session 或 Authorization: Bearer token，
 *       則一併回傳當前使用者的報名狀態（registrationStatus）。
 *
 * 輸出：EventDetail（含 registrationStatus 若已登入）
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";
import { RegistrationStatus } from "@/generated/prisma/client";

/**
 * 嘗試從 request 解析使用者 ID（不強制要求登入）
 * 先嘗試 cookie session，再嘗試 Bearer token
 *
 * @param request NextRequest
 * @returns userId string 或 null
 */
async function tryGetUserId(request: NextRequest): Promise<string | null> {
  // 1. 嘗試 cookie session
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  // 2. 嘗試 Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)!,
        salt: "authjs.session-token",
      });
      if (decoded?.sub) return decoded.sub;
    } catch {
      // token 無效，忽略
    }
  }

  return null;
}

/**
 * GET /api/events/[id] — 取得活動詳情（公開）
 *
 * 若已登入（cookie 或 Bearer token），回傳物件中包含：
 *   registrationStatus: "REGISTERED" | "CANCELLED" | null
 *   （null 表示尚未報名或無記錄）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    // 查詢已發布的活動（公開端點只顯示 published = true 的活動）
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        description: true,
        startAt: true,
        endAt: true,
        location: true,
        capacity: true,
        published: true,
        createdAt: true,
        // 已報名且狀態為 REGISTERED 的人數
        _count: {
          select: {
            registrations: {
              where: { status: RegistrationStatus.REGISTERED },
            },
          },
        },
      },
    });

    if (!event || !event.published) {
      return NextResponse.json({ error: "活動不存在或尚未發布" }, { status: 404 });
    }

    // 計算剩餘名額
    const registeredCount = event._count.registrations;
    const spotsLeft = event.capacity !== null ? event.capacity - registeredCount : null;

    // 嘗試取得當前使用者的報名狀態（選填，無需登入）
    let registrationStatus: RegistrationStatus | null = null;
    const userId = await tryGetUserId(request);

    if (userId) {
      const registration = await db.registration.findUnique({
        where: { userId_eventId: { userId, eventId } },
        select: { status: true },
      });
      registrationStatus = registration?.status ?? null;
    }

    const { _count, ...eventData } = event;

    return NextResponse.json({
      ...eventData,
      registeredCount,
      spotsLeft,
      ...(userId !== null && { registrationStatus }),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
