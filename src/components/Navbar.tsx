"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

const NAV_LINKS = [
  { key: "home", href: "/" },
  { key: "events", href: "/events" },
  { key: "members", href: "/members" },
  { key: "achievements", href: "/achievements" },
  { key: "sponsors", href: "/sponsors" },
  { key: "alumni", href: "/alumni" },
  { key: "contact", href: "/contact" },
] as const;

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale(); // used for display (button text, link prefixes)
  const pathname = usePathname(); // always reflects the current URL
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLangSwitch = () => {
    // Derive locale from the actual URL (immune to stale useLocale context after soft-nav)
    const segments = pathname.split("/");
    const currentLocale = segments[1] === "en" ? "en" : "zh";
    const targetLocale = currentLocale === "zh" ? "en" : "zh";
    segments[1] = targetLocale;
    const newPath = segments.join("/") || `/${targetLocale}`;
    router.replace(newPath);
  };

  const localizedHref = (href: string) =>
    href === "/" ? `/${locale}` : `/${locale}${href}`;

  return (
    <nav
      style={{ backgroundColor: PRIMARY }}
      className="sticky top-0 z-50 shadow-md"
      aria-label="主導覽列"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="flex-shrink-0 flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              src="/assets/logo.png"
              alt="ROCSAUT"
              width={36}
              height={36}
              className="object-contain"
              priority
            />
            <span className="font-bold text-base tracking-widest hidden sm:block" style={{ color: SECONDARY }}>
              ROCSAUT
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(({ key, href }) => {
              const fullHref = localizedHref(href);
              const isActive = pathname === fullHref;
              return (
                <Link
                  key={key}
                  href={fullHref}
                  className="text-sm font-medium transition-all duration-150 hover:opacity-100 pb-0.5"
                  style={{
                    color: isActive ? SECONDARY : `${SECONDARY}bb`,
                    borderBottom: isActive ? `2px solid ${SECONDARY}` : "2px solid transparent",
                  }}
                >
                  {t(key)}
                </Link>
              );
            })}

            <button
              onClick={handleLangSwitch}
              className="ml-2 px-3 py-1 rounded-md text-xs font-semibold tracking-wide border transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{ borderColor: SECONDARY, color: PRIMARY, backgroundColor: SECONDARY }}
              aria-label="切換語言"
            >
              {t("switchLang")}
            </button>
          </div>

          {/* Mobile: lang + hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={handleLangSwitch}
              className="px-2 py-1 rounded text-xs font-semibold border"
              style={{ borderColor: SECONDARY, color: PRIMARY, backgroundColor: SECONDARY }}
              aria-label="切換語言"
            >
              {t("switchLang")}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-2 rounded transition-opacity hover:opacity-80"
              style={{ color: SECONDARY, touchAction: "manipulation" }}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "關閉選單" : "開啟選單"}
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div id="mobile-menu" className="md:hidden border-t" style={{ borderColor: `${SECONDARY}33`, backgroundColor: PRIMARY }}>
          <div className="px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map(({ key, href }) => {
              const fullHref = localizedHref(href);
              const isActive = pathname === fullHref;
              return (
                <Link
                  key={key}
                  href={fullHref}
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-medium transition-all duration-150"
                  style={{
                    color: isActive ? PRIMARY : SECONDARY,
                    backgroundColor: isActive ? SECONDARY : "transparent",
                  }}
                >
                  {t(key)}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
