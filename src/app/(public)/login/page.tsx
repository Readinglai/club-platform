/**
 * login/page.tsx — 登入頁面
 *
 * 社團成員登入入口，使用 Google OAuth。
 * 僅限 utoronto.ca 或 mail.utoronto.ca 信箱。
 *
 * 此頁面為 Server Component，SignInButton 是 Client Component
 * 負責呼叫 next-auth/react 的 signIn()。
 */

import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";
import { SignInButton } from "./SignInButton";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

/**
 * 將 NextAuth 的錯誤代碼轉換成中文提示訊息
 */
function getErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  switch (error) {
    case "AccessDenied":
      return "僅限 utoronto.ca 或 mail.utoronto.ca 信箱登入，請使用校園帳號。";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Google 登入發生錯誤，請稍後再試。";
    default:
      return "登入時發生未知錯誤，請稍後再試。";
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  /* 已登入的使用者直接依角色導向，不顯示登入頁 */
  const session = await auth();
  if (session?.user) {
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    const level = ROLE_LEVEL[role] ?? ROLE_LEVEL.MEMBER;
    redirect(level >= 3 ? "/zh/admin" : "/zh");
  }

  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);
  const callbackUrl = params.callbackUrl ?? "/api/auth/post-login";

  return (
    /* 全螢幕置中容器，使用主色深藍作為背景 */
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#1a2744" }}
    >
      {/* 登入卡片 */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl px-8 py-10 flex flex-col items-center gap-6">

        {/* Logo 與社團名稱 */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-20 h-20">
            <Image
              src="/assets/logo.png"
              alt="ROCSAUT Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1
            className="text-2xl font-bold tracking-wide"
            style={{ color: "#1a2744" }}
          >
            ROCSAUT
          </h1>
        </div>

        {/* 分隔線 */}
        <div className="w-full h-px" style={{ backgroundColor: "#c9b99a" }} />

        {/* 說明文字 */}
        <div className="text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            社團成員管理平台
          </p>
          <p className="text-xs text-gray-400 mt-1">
            僅限 <span className="font-medium text-gray-500">utoronto.ca</span> 信箱
          </p>
        </div>

        {/* 錯誤提示（登入失敗時顯示） */}
        {errorMessage && (
          <div className="w-full rounded-lg px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 text-center leading-relaxed">
              {errorMessage}
            </p>
          </div>
        )}

        {/* Google 登入按鈕（Client Component） */}
        <SignInButton callbackUrl={callbackUrl} />

        {/* 頁腳說明 */}
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          登入即代表您同意遵守社團規範。
          <br />
          如有問題請聯繫 exec 團隊。
        </p>
      </div>
    </div>
  );
}
