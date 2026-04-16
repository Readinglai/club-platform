/**
 * route.ts — NextAuth API Route Handler
 *
 * 將所有 /api/auth/* 請求（GET 和 POST）交給 NextAuth 處理。
 * 涵蓋的路徑包括：
 *   GET  /api/auth/session        → 取得當前 session
 *   GET  /api/auth/csrf           → CSRF token
 *   GET  /api/auth/providers      → 已設定的 OAuth providers 列表
 *   GET  /api/auth/signin         → 觸發 OAuth 登入流程
 *   GET  /api/auth/callback/...   → OAuth callback（provider 登入後導回）
 *   POST /api/auth/signout        → 登出
 */

import { handlers } from "@/lib/auth";

// 直接導出 NextAuth 的 GET 和 POST handler
export const { GET, POST } = handlers;
