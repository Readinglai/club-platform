/**
 * /api/auth/token
 *
 * 行動 App 用端點。接受 Google OAuth 授權碼，交換並驗證後
 * 回傳與 NextAuth v5 相容的 JWT access token。
 *
 * Body:     { code: string; redirectUri: string }
 * Response: { token: string; expiresAt: string }
 *
 * 流程：
 *   1. 用 Google OAuth2 token endpoint 交換 code 取得 id_token
 *   2. Decode id_token payload 取得 email
 *   3. 在 DB 查 User（email 必須存在）
 *   4. 若不存在 → 403
 *   5. 用 @auth/core/jwt encode 產生 NextAuth 相容 JWT
 *   6. 回傳 { token, expiresAt }
 */

import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { db } from "@/lib/db";

/** Google Token Endpoint 回應型別 */
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
  refresh_token?: string;
}

/** Google id_token payload 型別（base64 解碼後的 JSON） */
interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  iat: number;
  exp: number;
}

/**
 * 解碼 JWT payload（不驗證簽名）。
 * 由於 id_token 是直接從 Google token endpoint 取得，信任度足夠。
 *
 * @param jwt JWT 字串（header.payload.signature）
 * @returns 解碼後的 payload 物件
 */
function decodeJwtPayload<T>(jwt: string): T {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  // Base64URL → Base64 → Buffer → JSON
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json) as T;
}

/**
 * POST /api/auth/token — 行動 App Google OAuth code exchange
 *
 * @param request Body: { code: string; redirectUri: string }
 * @returns { token: string; expiresAt: string }
 *
 * Error responses:
 *   400 — 缺少必要欄位或 Google 交換失敗
 *   403 — Email 不在系統使用者名單中
 *   500 — 伺服器錯誤
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { code, redirectUri } = body as { code?: unknown; redirectUri?: unknown };

    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    if (typeof redirectUri !== "string" || !redirectUri.trim()) {
      return NextResponse.json({ error: "redirectUri is required" }, { status: 400 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[auth/token] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Step 1: 向 Google 交換 id_token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("[auth/token] Google token exchange failed:", tokenRes.status, errorBody);
      return NextResponse.json(
        { error: "Google OAuth code exchange failed", detail: errorBody },
        { status: 400 }
      );
    }

    const googleToken = (await tokenRes.json()) as GoogleTokenResponse;

    if (!googleToken.id_token) {
      return NextResponse.json({ error: "Google did not return id_token" }, { status: 400 });
    }

    // Step 2: Decode id_token payload 取得 email
    let payload: GoogleIdTokenPayload;
    try {
      payload = decodeJwtPayload<GoogleIdTokenPayload>(googleToken.id_token);
    } catch {
      return NextResponse.json({ error: "Failed to decode Google id_token" }, { status: 400 });
    }

    const email = payload.email;
    if (!email) {
      return NextResponse.json({ error: "Email not found in id_token" }, { status: 400 });
    }

    // Step 3: 在 DB 查 User
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    });

    // Step 4: 若不存在 → 403
    if (!user) {
      return NextResponse.json(
        { error: "User not registered in this platform" },
        { status: 403 }
      );
    }

    // Step 5: 用 @auth/core/jwt encode 產生 NextAuth 相容 JWT
    const maxAge = 30 * 24 * 60 * 60; // 30 天（秒）
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    const token = await encode({
      token: {
        sub: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
      },
      secret: process.env.AUTH_SECRET!,
      salt: "authjs.session-token",
      maxAge,
    });

    // Step 6: 回傳 token 與過期時間
    return NextResponse.json({
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[auth/token] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
