"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

export function SignOutButton() {
  const t = useTranslations("auth");

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80 active:scale-95 cursor-pointer"
      style={{ backgroundColor: "#c9b99a", color: "#1a2744" }}
    >
      {t("signOut")}
    </button>
  );
}
