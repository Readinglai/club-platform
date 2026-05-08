/**
 * [locale]/login/page.tsx — 多語系登入頁面
 *
 * 社團成員登入入口，使用 Google OAuth 或 Resend magic link。
 * 僅限 utoronto.ca 或 mail.utoronto.ca 信箱。
 *
 * 已登入使用者：直接依角色跳轉（不經過 /api/auth/post-login），
 * 避免額外 redirect hop 造成 ERR_TOO_MANY_REDIRECTS。
 */

import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { ROLE_LEVEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client";
import { LoginButtons } from "./LoginButtons";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

/**
 * 將 NextAuth 錯誤代碼對應到 i18n key
 */
function getErrorKey(error: string | undefined): string | null {
  if (!error) return null;
  switch (error) {
    case "AccessDenied":
      return "errorAccessDenied";
    case "OAuthSignin":
    case "OAuthCallback":
      return "errorOAuth";
    case "EmailSignin":
      return "errorEmail";
    default:
      return "errorUnknown";
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // 已登入的使用者直接依角色導向，不顯示登入頁
  // 注意：不再經過 /api/auth/post-login 中轉，避免多一層 redirect
  // 造成 /zh/login → /api/auth/post-login → /zh/admin → ... 無限迴圈
  const session = await auth();
  if (session?.user) {
    const role = (session.user.role as Role | undefined) ?? "MEMBER";
    const level = ROLE_LEVEL[role] ?? ROLE_LEVEL.MEMBER;
    redirect(level >= 3 ? "/zh/admin" : "/zh");
  }

  const params = await searchParams;
  const errorKey = getErrorKey(params.error);
  const callbackUrl = params.callbackUrl ?? "/api/auth/post-login";
  const t = await getTranslations("auth");

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#1a2744" }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl px-8 py-10 flex flex-col items-center gap-6">
        {/* Logo */}
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

        <div className="w-full h-px" style={{ backgroundColor: "#c9b99a" }} />

        {/* Description */}
        <div className="text-center">
          <p className="text-sm text-gray-600 leading-relaxed">
            {t("platformName")}
          </p>
        </div>

        {/* Error message */}
        {errorKey && (
          <div className="w-full rounded-lg px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 text-center leading-relaxed">
              {t(errorKey as "errorAccessDenied" | "errorOAuth" | "errorEmail" | "errorUnknown")}
            </p>
          </div>
        )}

        <LoginButtons callbackUrl={callbackUrl} />

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          {t("termsNote")}
        </p>
      </div>
    </div>
  );
}
