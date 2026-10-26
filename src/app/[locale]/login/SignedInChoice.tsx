"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

/** Shown on the sign-in page to someone already signed in: carry on, or switch accounts. */
export function SignedInChoice({ who, continueUrl }: { who: string; continueUrl: string }) {
  const t = useTranslations("auth");
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-center text-sm text-gray-700">{t("signedInAs", { who })}</p>
      <Link
        href={continueUrl}
        className="flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-white"
        style={{ backgroundColor: "#1a2744" }}
      >
        {t("continueSignedIn")}
      </Link>
      <button
        type="button"
        // Sign out, then come back to this page to sign in with another account.
        onClick={() => signOut({ callbackUrl: window.location.pathname + window.location.search })}
        className="min-h-11 w-full rounded-lg border text-sm font-medium"
        style={{ borderColor: "#1a2744", color: "#1a2744" }}
      >
        {t("useDifferentAccount")}
      </button>
    </div>
  );
}
