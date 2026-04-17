import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

/** GET /api/admin/site-config?key=heroImageUrl */
export async function GET(request: NextRequest) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key 為必填" }, { status: 400 });
    const record = await db.siteConfig.findUnique({ where: { key } });
    return NextResponse.json({ key, value: record?.value ?? null });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/** PATCH /api/admin/site-config  body: { key, value } */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const { key, value } = await request.json();
    if (typeof key !== "string" || typeof value !== "string") {
      return NextResponse.json({ error: "key 和 value 為必填字串" }, { status: 400 });
    }

    const record = await db.siteConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return NextResponse.json(record);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
