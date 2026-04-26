/**
 * route.ts — 個人資料 API（Portal 版本）
 *
 * 功能：取得與更新當前登入使用者的個人資料
 * 輸入：
 *   GET  — 無 body（從 session 或 Bearer token 識別使用者）
 *   PATCH — body: { name?: string; image?: string }
 * 輸出：
 *   GET  — UserProfile（id, name, email, image, role, department, createdAt）
 *   PATCH — 更新後的 UserProfile
 * 驗證：未登入回傳 401
 *
 * 此端點為 /api/user/profile 的 portal 版本，
 * 供行動 App 使用（支援 Authorization: Bearer token）。
 * 業務邏輯與原版相同。
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decode } from "@auth/core/jwt";

/** 回傳的使用者欄位（不含密碼或敏感 token） */
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
  department: {
    select: {
      id: true,
      slug: true,
      name: true,
    },
  },
} as const;

/**
 * 嘗試取得已登入使用者的 ID
 * 先嘗試 cookie session，再嘗試 Bearer token
 */
async function tryGetUserId(request: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: process.env.AUTH_SECRET!,
        salt: "authjs.session-token",
      });
      if (decoded?.sub) return decoded.sub;
    } catch {
      // token 無效，忽略
    }
  }

  return null;
}

/** GET /api/portal/profile — 取得當前登入使用者資料 */
export async function GET(request: NextRequest) {
  const userId = await tryGetUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) {
    return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  }

  return NextResponse.json(user);
}

/** PATCH /api/portal/profile — 更新當前登入使用者的 name 和/或 image */
export async function PATCH(request: NextRequest) {
  const userId = await tryGetUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { name, image } = body as { name?: unknown; image?: unknown };
  const updateData: { name?: string; image?: string } = {};

  if (typeof name === "string" && name.trim().length > 0) {
    updateData.name = name.trim();
  }
  if (typeof image === "string") {
    updateData.image = image;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "無有效更新欄位" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: userId },
    data: updateData,
    select: USER_SELECT,
  });

  return NextResponse.json(user);
}
