import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[role] < 4) return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        department: { select: { id: true, slug: true, name: true } },
        createdAt: true,
      },
    });

    if (!user) return NextResponse.json({ error: "成員不存在" }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const currentRole = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[currentRole] < 5) return NextResponse.json({ error: "需要 SUPER_ADMIN 權限" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const { name, role, departmentId } = body;

    const user = await db.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(departmentId !== undefined && {
          departmentId: departmentId === "" ? null : departmentId,
        }),
      },
      select: { id: true, name: true, email: true, role: true, departmentId: true },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const currentRole = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[currentRole] < 5) return NextResponse.json({ error: "需要 SUPER_ADMIN 權限" }, { status: 403 });

    const { id } = await params;

    if (session.user.id === id) {
      return NextResponse.json({ error: "不能刪除自己的帳號" }, { status: 400 });
    }

    await db.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
