import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

interface MemberInput {
  email: string;
  name: string;
  role?: string;
  departmentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登入" }, { status: 401 });

    const currentRole = (session.user.role as Role | undefined) ?? "MEMBER";
    if (ROLE_LEVEL[currentRole] < 5) return NextResponse.json({ error: "需要 SUPER_ADMIN 權限" }, { status: 403 });

    const body = await request.json();
    const { members }: { members: MemberInput[] } = body;

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: "members 陣列為必填且不得為空" }, { status: 400 });
    }

    const VALID_ROLES = ["SUPER_ADMIN", "EXEC", "TEAM_LEAD", "MEMBER"];
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const m of members) {
      if (!m.email || !m.name) {
        errors.push(`缺少 email 或 name：${JSON.stringify(m)}`);
        continue;
      }

      const role = VALID_ROLES.includes(m.role ?? "") ? (m.role as Role) : "MEMBER";

      try {
        const existing = await db.user.findUnique({ where: { email: m.email } });
        await db.user.upsert({
          where: { email: m.email },
          create: {
            email: m.email,
            name: m.name,
            role,
            departmentId: m.departmentId ?? null,
          },
          update: {
            name: m.name,
            role,
            ...(m.departmentId !== undefined && {
              departmentId: m.departmentId === "" ? null : m.departmentId,
            }),
          },
        });
        if (existing) updated++; else imported++;
      } catch {
        errors.push(`${m.email}：寫入失敗`);
      }
    }

    return NextResponse.json({ imported, updated, errors });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
