/**
 * SignOutButton.tsx — 登出按鈕（Client Component）
 *
 * 由於 signOut() 是 next-auth/react 的 client-side 函數，
 * 必須在 Client Component 中呼叫，故獨立抽出此元件。
 * 登出後導向 /login 頁面。
 */

"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80 active:scale-95 cursor-pointer"
      style={{ backgroundColor: "#c9b99a", color: "#1a2744" }}
    >
      登出
    </button>
  );
}
