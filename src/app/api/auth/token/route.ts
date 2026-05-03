/**
 * /api/auth/token
 *
 * 行動 App 用端點。接受 Google OAuth 授權碼（PKCE 流程），交換並驗證後
 * 回傳 JWT access token 與 user 資料。
 *
 * Body:     { code: string; redirectUri: string; codeVerifier?: string }
 * Response: { token: string; user: { id, email, name, role }; expiresAt: string }
 *
 * 流程：
 *   1. 用 Google OAuth2 token endpoint 交換 code（若有 codeVerifier 則帶入 PKCE）
 *   2. Decode id_token payload 取得 email
 *   3. 在 DB 查 User（email 必須存在）
 *   4. 若不存在 → 403
 *   5. 用 @auth/core/jwt encode 產生 NextAuth 相容 JWT
 *   6. 回傳 { token, user, expiresAt }
 *
 * CORS：允許本地 Expo dev server 與生產環境呼叫。
 */

import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { db } from "@/lib/db";

// ── CORS 設定 ────────────────────────────────────────────────────────────────

/** 允許的 CORS origins（包含本地 Expo web dev server 與生產域名） */
const ALLOWED_ORIGINS = [
  "http://localhost:8083",
  "http://localhost:19006",
  "http://localhost:8081",
  "http://localhost:3000",
  "exp://localhost:8083",
  "https://rocsaut-club-platform.vercel.app",
];

/**
 * 根據 request origin 產生 CORS response headers。
 * 若 origin 在白名單內則直接回傳，否則回傳第一個預設值。
 *
 * @param origin Request 的 Origin header 值
 * @returns CORS headers 物件
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// ── OPTIONS handler（CORS preflight） ────────────────────────────────────────

/**
 * OPTIONS /api/auth/token — CORS preflight
 * 瀏覽器在跨域 POST 前會先送 OPTIONS，這裡回傳 204 並附上正確的 CORS headers。
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// ── 型別定義 ─────────────────────────────────────────────────────────────────

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

// ── 工具函數 ─────────────────────────────────────────────────────────────────

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
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json) as T;
}

// ── POST handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/token — 行動 App Google OAuth code exchange（支援 PKCE）
 *
 * @param request Body: { code: string; redirectUri: string; codeVerifier?: string }
 * @returns { token: string; user: { id, email, name, role }; expiresAt: string }
 *
 * Error responses:
 *   400 — 缺少必要欄位或 Google 交換失敗
 *   403 — Email 不在系統使用者名單中
 *   500 — 伺服器錯誤
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHdrs = getCorsHeaders(origin);

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: corsHdrs }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: corsHdrs }
      );
    }

    const bodyObj = body as Record<string, unknown>;

    // Dev bypass：跳過 Google OAuth，直接以 email 查 user 並簽發 JWT
    // 僅在 NODE_ENV !== "production" 時生效
    if (process.env.NODE_ENV !== "production" && bodyObj.devBypass === true) {
      const devEmail =
        typeof bodyObj.email === "string" && bodyObj.email.trim()
          ? bodyObj.email.trim()
          : "flyincloud2001@gmail.com";

      const devUser = await db.user.findUnique({
        where: { email: devEmail },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!devUser) {
        return NextResponse.json(
          { error: `Dev bypass: user ${devEmail} not found` },
          { status: 403, headers: corsHdrs }
        );
      }

      const jwtSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
      if (!jwtSecret) {
        return NextResponse.json(
          { error: "Server configuration error: missing JWT secret" },
          { status: 500, headers: corsHdrs }
        );
      }

      const maxAge = 30 * 24 * 60 * 60;
      const expiresAt = new Date(Date.now() + maxAge * 1000);
      const token = await encode({
        token: { sub: devUser.id, role: devUser.role, email: devUser.email, name: devUser.name },
        secret: jwtSecret,
        salt: "authjs.session-token",
        maxAge,
      });

      return NextResponse.json(
        { token, user: devUser, expiresAt: expiresAt.toISOString() },
        { headers: corsHdrs }
      );
    }

    // codeVerifier 是 PKCE 必要參數，從 App 傳入
    const { code, redirectUri, codeVerifier } = bodyObj as {
      code?: unknown;
      redirectUri?: unknown;
      codeVerifier?: unknown;
    };

    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { error: "code is required" },
        { status: 400, headers: corsHdrs }
      );
    }
    if (typeof redirectUri !== "string" || !redirectUri.trim()) {
      return NextResponse.json(
        { error: "redirectUri is required" },
        { status: 400, headers: corsHdrs }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("[auth/token] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500, headers: corsHdrs }
      );
    }

    // Step 1: 向 Google 交換 id_token（PKCE 流程須帶 code_verifier）
    const tokenParams: Record<string, string> = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    };

    // 若有 codeVerifier 則加入（PKCE S256 流程必須）
    if (typeof codeVerifier === "string" && codeVerifier.trim()) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenRes.ok) {
      const errorBody = await tokenRes.text();
      console.error("[auth/token] Google token exchange failed:", tokenRes.status, errorBody);
      return NextResponse.json(
        { error: "Google OAuth code exchange failed", detail: errorBody },
        { status: 400, headers: corsHdrs }
      );
    }

    const googleToken = (await tokenRes.json()) as GoogleTokenResponse;

    if (!googleToken.id_token) {
      return NextResponse.json(
        { error: "Google did not return id_token" },
        { status: 400, headers: corsHdrs }
      );
    }

    // Step 2: Decode id_token payload 取得 email
    let payload: GoogleIdTokenPayload;
    try {
      payload = decodeJwtPayload<GoogleIdTokenPayload>(googleToken.id_token);
    } catch {
      return NextResponse.json(
        { error: "Failed to decode Google id_token" },
        { status: 400, headers: corsHdrs }
      );
    }

    const email = payload.email;
    if (!email) {
      return NextResponse.json(
        { error: "Email not found in id_token" },
        { status: 400, headers: corsHdrs }
      );
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
        { status: 403, headers: corsHdrs }
      );
    }

    // Step 5: 用 @auth/core/jwt encode 產生 NextAuth 相容 JWT
    const maxAge = 30 * 24 * 60 * 60; // 30 天（秒）
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    // AUTH_SECRET（v5 命名）或 NEXTAUTH_SECRET（v4 命名）皆可
    const jwtSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
    if (!jwtSecret) {
      console.error("[auth/token] AUTH_SECRET and NEXTAUTH_SECRET are both unset");
      return NextResponse.json(
        { error: "Server configuration error: missing JWT secret" },
        { status: 500, headers: corsHdrs }
      );
    }

    const token = await encode({
      token: {
        sub: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
      },
      secret: jwtSecret,
      salt: "authjs.session-token",
      maxAge,
    });

    // Step 6: 回傳 token、user 與過期時間
    // user 欄位供 App 直接使用（設定 useAuthStore）
    return NextResponse.json(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        expiresAt: expiresAt.toISOString(),
      },
      { headers: corsHdrs }
    );
  } catch (err) {
    const origin2 = request.headers.get("origin");
    // DEBUG: 回傳詳細錯誤訊息，找到 root cause 後移除
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack?.slice(0, 500) : "";
    console.error("[auth/token] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", debug_message: msg, debug_stack: stack },
      { status: 500, headers: getCorsHeaders(origin2) }
    );
  }
}
