/**
 * db.ts — Prisma Client 單例（Prisma 7 + @prisma/adapter-pg）
 *
 * Prisma 7 採用 driver adapter 模式，PrismaClient 需要顯式傳入資料庫連線。
 * 使用 @prisma/adapter-pg（PrismaPg）連接 Supabase PostgreSQL。
 *
 * 連線策略：
 * - 開發環境：從 process.env.DATABASE_URL 讀取（由 .env.local 提供）
 * - 生產環境：從 Vercel 環境變數讀取 DATABASE_URL
 *
 * 單例設計：
 * - 生產環境直接建立，process 生命週期內只建立一次
 * - 開發環境透過 global.__prisma 快取，避免熱重載（HMR）造成連線洩漏
 *
 * 用法：
 *   import { db } from "@/lib/db";
 *   const users = await db.user.findMany();
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// 在 TypeScript 全域命名空間中聲明快取變數，避免型別錯誤
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * 建立 Prisma Client 實例（Prisma 7 driver adapter 模式）。
 *
 * PrismaPg 接受 connection string、pg.Pool 或 pg.PoolConfig。
 * 傳入 DATABASE_URL 字串即可，PrismaPg 會內部建立連線池。
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "[db] DATABASE_URL 環境變數未設定。\n" +
        "開發環境請確認 .env.local 已設定此變數。\n" +
        "生產環境請確認 Vercel 環境變數已設定。"
    );
  }

  // PrismaPg adapter：將 pg.Pool 包裝成 Prisma 7 可用的 driver adapter 介面
  const adapter = new PrismaPg(connectionString);

  return new PrismaClient({
    adapter,
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
