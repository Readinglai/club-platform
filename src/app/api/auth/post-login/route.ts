import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;

  if (!session?.user) {
    return NextResponse.redirect(`${base}/login`);
  }

  const role = (session.user.role as Role | undefined) ?? "MEMBER";
  const level = ROLE_LEVEL[role] ?? ROLE_LEVEL.MEMBER;
  const dest = level >= 3 ? "/zh/admin" : "/zh";
  return NextResponse.redirect(`${base}${dest}`);
}
