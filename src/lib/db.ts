/**
 * db.ts — Prisma Client 單例
 *
 * 在 Next.js 開發環境中，每次熱重載（HMR）都會重新執行模組，
 * 若直接 new PrismaClient() 會導致資料庫連線數暴增。
 * 此檔案使用全域變數快取，確保整個程序只存在一個 PrismaClient 實例。
 *
 * 用法：
 *   import { db } from "@/lib/db";
 *   const users = await db.user.findMany();
 */

import { PrismaClient } from "../generated/prisma";

// 在 TypeScript 全域命名空間中聲明快取變數，避免型別錯誤
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * 取得 Prisma Client 單例。
 * - 生產環境：直接建立新實例（process 生命週期內只啟動一次）。
 * - 開發環境：透過 global.__prisma 快取，防止熱重載造成連線洩漏。
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

// 開發環境下將實例存入全域，讓後續的熱重載可以重用
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
