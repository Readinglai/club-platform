import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** After sign-in everyone lands on the portal, which shows what their positions allow. */
export async function GET(request: NextRequest) {
  const session = await auth();
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const base = process.env.NEXTAUTH_URL ?? `${proto}://${host}`;

  return NextResponse.redirect(`${base}${session?.user ? "/portal" : "/login"}`);
}
