import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { SignInButton } from "./SignInButton";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

function getErrorKey(error: string | undefined): string | null {
  if (!error) return null;
  switch (error) {
    case "AccessDenied":
      return "errorAccessDenied";
    case "OAuthSignin":
    case "OAuthCallback":
      return "errorOAuth";
    default:
      return "errorUnknown";
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const errorKey = getErrorKey(params.error);
  const callbackUrl = params.callbackUrl ?? "/dashboard";
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
          <p className="text-xs text-gray-400 mt-1">
            {t("emailRestriction", { domain: "utoronto.ca" })}
          </p>
        </div>

        {/* Error message */}
        {errorKey && (
          <div className="w-full rounded-lg px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 text-center leading-relaxed">
              {t(errorKey as "errorAccessDenied" | "errorOAuth" | "errorUnknown")}
            </p>
          </div>
        )}

        <SignInButton callbackUrl={callbackUrl} />

        {/* Footer note */}
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          {t("termsNote")}
          <br />
          {t("contactNote")}
        </p>
      </div>
    </div>
  );
}
