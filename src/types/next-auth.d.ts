/**
 * next-auth.d.ts — NextAuth 型別擴展
 *
 * NextAuth 預設的 Session.user 只有 name / email / image。
 * 此檔案擴展型別，加入我們自訂的 id 和 role 欄位，
 * 讓 TypeScript 在使用 session.user.role 時不會報錯。
 *
 * 參考：https://authjs.dev/getting-started/typescript
 */

import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  /**
   * 擴展 Session 型別
   * 在 session.user 上加入 id 和 role，
   * 供 Client Components 使用 useSession() 時取得這兩個值。
   */
  interface Session {
    user: {
      /** 使用者在資料庫中的唯一 ID（cuid） */
      id: string;
      /** 使用者在社團中的角色（SUPER_ADMIN / EXEC / TEAM_LEAD / MEMBER） */
      role: Role;
    } & DefaultSession["user"];
  }

  /**
   * 擴展 User 型別
   * 當 Prisma Adapter 從資料庫讀取 User 時，
   * 此型別確保 role 欄位會被正確識別。
   */
  interface User {
    /** 使用者角色，預設為 MEMBER */
    role: Role;
  }
}
