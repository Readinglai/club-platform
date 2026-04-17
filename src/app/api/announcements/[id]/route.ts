import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

/** GET /api/announcements/[id] — 取得單一公告完整內容（已發布） */
export async function GET(
  _request: NextRequest,
  { params }: Params
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;

  const announcement = await db.announcement.findUnique({
    where: { id, published: true },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: { select: { name: true } },
      reads: {
        where: { userId: session.user.id },
        select: { id: true },
      },
    },
  });

  if (!announcement) {
    return NextResponse.json({ error: "公告不存在" }, { status: 404 });
  }

  const { reads, ...rest } = announcement;
  return NextResponse.json({ ...rest, isRead: reads.length > 0 });
}

/** PUT /api/announcements/[id] — 更新公告（EXEC+） */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { title, content, published } = body;

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published }),
      },
    });

    return NextResponse.json(announcement);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/** DELETE /api/announcements/[id] — 刪除公告（EXEC+） */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const { id } = await params;
    await db.announcement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
