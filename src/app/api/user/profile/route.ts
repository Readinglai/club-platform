/**
 * route.ts — 個人資料 API
 *
 * 功能：取得與更新當前登入使用者的個人資料
 * 輸入：
 *   GET  — 無 body（從 session 識別使用者）
 *   PATCH — body: { name?: string; image?: string }
 * 輸出：
 *   GET  — UserProfile（id, name, email, image, role, team, createdAt）
 *   PATCH — 更新後的 UserProfile
 * 驗證：未登入回傳 401
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

/** 回傳的使用者欄位（不含密碼或敏感 token） */
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
  team: {
    select: {
      id: true,
      slug: true,
      name: true,
    },
  },
} as const;

/** GET /api/user/profile — 取得當前登入使用者資料 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: USER_SELECT,
  });

  if (!user) {
    return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  }

  return NextResponse.json(user);
}

/** PATCH /api/user/profile — 更新當前登入使用者的 name 和/或 image */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
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
    where: { id: session.user.id },
    data: updateData,
    select: USER_SELECT,
  });

  return NextResponse.json(user);
}
