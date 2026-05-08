import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const base = process.env.NEXTAUTH_URL ?? `${proto}://${host}`;

  if (!session?.user) {
    return NextResponse.redirect(`${base}/login`);
  }

  const role = (session.user.role as Role | undefined) ?? "MEMBER";
  const level = ROLE_LEVEL[role] ?? ROLE_LEVEL.MEMBER;
  let dest: string;
  if (level >= 4) dest = "/admin";
  else if (level === 3) dest = "/exec";
  else dest = "/portal";
  return NextResponse.redirect(`${base}${dest}`);
}
