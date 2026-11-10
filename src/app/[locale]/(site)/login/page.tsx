/**
 * [locale]/login/page.tsx — 多語系登入頁面
 *
 * 登入入口，使用 Google OAuth 或 Email magic link。任何信箱皆可註冊，
 * 新帳號為 USER，首次登入後需完成個人資料。
 *
 * 已登入使用者：顯示「繼續」或「使用其他帳號登入」（先登出再回到此頁）。
 */

import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { LoginButtons } from "./LoginButtons";
import { SignedInChoice } from "./SignedInChoice";

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
  // Someone already signed in can carry on, or sign out to use another account.
  const session = await auth();

  const params = await searchParams;
  const errorKey = getErrorKey(params.error);
  const callbackUrl = params.callbackUrl ?? "/api/auth/post-login";
  // Only same-site paths, never another site.
  const continueUrl = params.callbackUrl?.startsWith("/") && !params.callbackUrl.startsWith("//") ? params.callbackUrl : "/portal";
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

        {session?.user ? (
          <SignedInChoice who={session.user.name || session.user.email || ""} continueUrl={continueUrl} />
        ) : (
          <LoginButtons callbackUrl={callbackUrl} />
        )}

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          {t("termsNote")}
        </p>
      </div>
    </div>
  );
}
