import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.EMAIL_API_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const user = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      return NextResponse.json(
        { error: "User not registered" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await db.verificationToken.upsert({
      where: { identifier_token: { identifier: email, token } },
      create: { identifier: email, token, expires },
      update: { expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://rocsaut-club-platform.vercel.app";
    const url = `${baseUrl}/api/auth/callback/resend?token=${token}&email=${encodeURIComponent(email)}`;

    await resend.emails.send({
      from: process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev",
      to: email,
      subject: "ROCSAUT 登入連結",
      html: `<p>請點擊以下連結登入 ROCSAUT 平台（10 分鐘內有效）：</p><p><a href="${url}">${url}</a></p>`,
    });

    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[magic-link] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
