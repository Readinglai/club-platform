import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";

/**
 * GET /api/auth/post-login
 *
 * Role-aware post-login redirect endpoint.
 * NextAuth's callbackUrl points here after OAuth; this reads the freshly-issued
 * session and sends the user to the right place:
 *   - EXEC / ADMIN / SUPER_ADMIN (level ≥ 3) → /zh/admin
 *   - MEMBER and below               (level ≤ 2) → /zh  (homepage)
 */
export async function GET() {
  const session = await auth();
  const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  if (!session?.user) {
    return NextResponse.redirect(`${base}/login`);
  }

  const role = (session.user.role as Role | undefined) ?? "MEMBER";
  const level = ROLE_LEVEL[role] ?? ROLE_LEVEL.MEMBER;
  const dest = level >= 3 ? "/zh/admin" : "/zh";

  return NextResponse.redirect(`${base}${dest}`);
}
