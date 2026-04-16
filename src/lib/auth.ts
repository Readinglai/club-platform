/**
 * auth.ts — NextAuth 設定（空殼）
 *
 * TODO：完整設定待任務 5 填入，目前僅導出空的 handlers 佔位，
 * 確保 src/app/api/auth/[...nextauth]/route.ts 可以正常 import。
 *
 * 預計設定：
 * - Google OAuth Provider
 * - 限制允許登入的 email 網域（mail.utoronto.ca / utoronto.ca）
 * - 將 Prisma User 角色寫入 session token
 */

// next-auth@beta 使用 NextAuth() 工廠函數
// import NextAuth from "next-auth";
// import Google from "next-auth/providers/google";

// 空殼導出，等 Prisma Adapter 與 Provider 設定完成後替換
export const authConfig = {};
