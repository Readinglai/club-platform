/**
 * proxy.ts — Next.js 16 Edge Proxy（取代舊版 middleware.ts）
 *
 * 在請求抵達頁面之前攔截，根據登入狀態進行路由保護。
 * 此檔案在 Edge Runtime 執行，只可引用 edge-safe 模組。
 *
 * 使用 NextAuth 的 authorized callback 處理路由保護邏輯，
 * 路由規則定義在 src/lib/auth.config.ts 的 callbacks.authorized。
 *
 * 保護規則（定義於 auth.config.ts）：
 *   /member/*  → 需要登入，否則導向 /login
 *   /admin/*   → 需要登入，否則導向 /login
 *
 * ⚠️ 此檔案不可 import db、@prisma/* 或任何 Node.js-only 套件。
 *    只使用 auth.config.ts（edge-safe），不使用完整的 auth.ts。
 */

import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * 建立一個輕量級的 NextAuth 實例，僅用於 JWT 驗證。
 * 不包含 Prisma Adapter，不查資料庫。
 */
const { auth } = NextAuth(authConfig);

/**
 * 導出 auth 作為預設的 proxy handler。
 * NextAuth 的 auth() 會自動呼叫 authConfig.callbacks.authorized 決定是否放行。
 */
export default auth;

/**
 * Proxy 執行範圍設定
 * matcher 決定哪些路徑會觸發 proxy：
 * - 排除 _next/static（靜態資源）
 * - 排除 _next/image（圖片最佳化）
 * - 排除 favicon.ico 和 public 資源
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)",
  ],
};
