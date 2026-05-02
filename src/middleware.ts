/**
 * src/middleware.ts
 *
 * 全域 CORS 中介層（Next.js App Router）。
 * 為所有 /api/* 路由加上 CORS response headers，
 * 讓行動 App（localhost:8083 / Expo dev server）可以跨域呼叫後端 API。
 *
 * 同時處理 OPTIONS preflight 請求（回傳 204）。
 * 不干涉 NextAuth v5 的 session cookie 流程。
 *
 * 設計原則：
 *   - 僅允許白名單 origin（非 wildcard），以支援 Authorization header
 *   - Vary: Origin 避免 CDN 快取污染
 *   - NextAuth /api/auth/* 仍照常運作（cookie 不受影響）
 */

import { NextRequest, NextResponse } from "next/server";

/** 允許的跨域來源白名單 */
const ALLOWED_ORIGINS = [
  "http://localhost:8083",
  "http://localhost:19006",
  "http://localhost:8081",
  "http://localhost:3000",
  "exp://localhost:8083",
  "https://rocsaut-club-platform.vercel.app",
];

/**
 * 根據 request origin 決定是否加入 CORS headers。
 * origin 必須在白名單內才允許；否則不加入（避免安全風險）。
 */
function getCorsOrigin(origin: string | null): string | null {
  if (!origin) return null;
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigin = getCorsOrigin(origin);

  // ── OPTIONS preflight（瀏覽器在發送帶有 Authorization header 的跨域請求前會先送 OPTIONS）
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    if (allowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      response.headers.set("Access-Control-Max-Age", "86400");
      response.headers.set("Vary", "Origin");
    }
    return response;
  }

  // ── 一般 API 請求：放行，並在 response 加上 CORS headers
  const response = NextResponse.next();
  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Vary", "Origin");
  }
  return response;
}

/** 只對 /api/* 套用此 middleware，其他路由不受影響 */
export const config = {
  matcher: ["/api/:path*"],
};
