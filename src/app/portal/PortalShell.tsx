"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import type { PortalSections } from "@/lib/access/portal-nav";
import { parentPath } from "./parent-path";

const PRIMARY = "#1a2744";
const SURFACE = "#f9f7f4";
const LINE = "#e5e4df";

type Item = { href: string; key: string; icon: string };

function navSections(s: PortalSections) {
  const me: Item[] = [
    { href: "/portal", key: "home", icon: "⌂" },
    { href: "/portal/membership", key: "membership", icon: "◎" },
    { href: "/portal/profile", key: "profile", icon: "☺" },
    { href: "/portal/announcements", key: "announcements", icon: "✉" },
  ];
  const work: Item[] = [
    s.events && { href: "/portal/events", key: "events", icon: "★" },
    s.team && { href: "/portal/team", key: "team", icon: "⚑" },
    s.approvals && { href: "/portal/approvals", key: "approvals", icon: "✓" },
    s.finance && { href: "/portal/finance", key: "finance", icon: "$" },
  ].filter(Boolean) as Item[];
  return [
    { key: "sectionMe", items: me },
    ...(work.length ? [{ key: "sectionWork", items: work }] : []),
  ];
}

/** Bottom tabs on phones: the most-used pages. */
const TABS: Item[] = [
  { href: "/portal", key: "home", icon: "⌂" },
  { href: "/portal/membership", key: "membership", icon: "◎" },
  { href: "/portal/profile", key: "profile", icon: "☺" },
];

const isActive = (pathname: string, href: string) =>
  href === "/portal" ? pathname === "/portal" : pathname === href || pathname.startsWith(`${href}/`);

/** Remember the chosen language for a year (read by src/i18n/request.ts). */
function saveLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; samesite=lax`;
}

function LanguageSwitch() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("portal");
  const choose = (next: string) => {
    saveLocale(next);
    router.refresh();
  };
  return (
    <div role="group" aria-label={t("language")} className="flex overflow-hidden rounded-lg border text-xs" style={{ borderColor: LINE }}>
      {[
        { code: "en", label: "EN" },
        { code: "zh", label: "中文" },
      ].map((l) => (
        <button
          key={l.code}
          type="button"
          aria-pressed={locale === l.code}
          onClick={() => choose(l.code)}
          className="flex-1 px-3 py-1.5"
          style={locale === l.code ? { backgroundColor: PRIMARY, color: "#fff" } : { color: PRIMARY }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function NavList({ sections, pathname, onNavigate }: { sections: ReturnType<typeof navSections>; pathname: string; onNavigate?: () => void }) {
  const t = useTranslations("portal");
  return (
    <nav aria-label={t("portalName")} className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.key}>
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{t(section.key)}</p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
                    style={active ? { backgroundColor: PRIMARY, color: "#fff" } : { color: PRIMARY }}
                  >
                    <span aria-hidden="true" className="w-4 text-center">{item.icon}</span>
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function PortalShell({ sections: allowed, children }: { sections: PortalSections; children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("portal");
  const [drawer, setDrawer] = useState(false);
  const sections = navSections(allowed);
  const atHome = pathname === "/portal";

  // Close the phone menu whenever the page changes.
  useEffect(() => {
    const close = () => setDrawer(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  const footer = (
    <div className="flex flex-col gap-3">
      <LanguageSwitch />
      <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="px-3 text-left text-xs text-gray-600 underline">
        {t("signOut")}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex" style={{ backgroundColor: SURFACE }}>
      {/* Computer: sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r px-3 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen" style={{ borderColor: LINE }}>
        <div className="flex flex-col gap-6 overflow-y-auto">
          <Link href="/portal" className="px-3 text-base font-bold" style={{ color: PRIMARY }}>{t("portalName")}</Link>
          <NavList sections={sections} pathname={pathname} />
        </div>
        {footer}
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        {/* Top bar: back link everywhere; menu button on phones */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b px-4 py-2.5 text-sm" style={{ backgroundColor: SURFACE, borderColor: LINE }}>
          {atHome ? (
            <span className="font-semibold lg:invisible" style={{ color: PRIMARY }}>{t("portalName")}</span>
          ) : (
            <Link href={parentPath(pathname)} className="font-medium hover:underline" style={{ color: PRIMARY }}>
              ← {t("back")}
            </Link>
          )}
          <button
            type="button"
            className="rounded-lg border px-3 py-1.5 lg:hidden"
            style={{ borderColor: LINE, color: PRIMARY }}
            aria-expanded={drawer}
            aria-controls="portal-drawer"
            onClick={() => setDrawer(true)}
          >
            ☰ {t("menu")}
          </button>
        </header>

        {children}
      </div>

      {/* Phone: menu drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" id="portal-drawer">
          <button type="button" aria-label={t("close")} className="absolute inset-0 bg-black/30" onClick={() => setDrawer(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col justify-between overflow-y-auto px-3 py-5 shadow-xl" style={{ backgroundColor: SURFACE }}>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between px-3">
                <span className="font-bold" style={{ color: PRIMARY }}>{t("portalName")}</span>
                <button type="button" onClick={() => setDrawer(false)} className="text-sm text-gray-600">✕ {t("close")}</button>
              </div>
              <NavList sections={sections} pathname={pathname} onNavigate={() => setDrawer(false)} />
            </div>
            {footer}
          </div>
        </div>
      )}

      {/* Phone: bottom tabs */}
      <nav aria-label={t("menu")} className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t lg:hidden" style={{ backgroundColor: SURFACE, borderColor: LINE }}>
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px]"
              style={{ color: active ? PRIMARY : "#6b7280", fontWeight: active ? 600 : 400 }}
            >
              <span aria-hidden="true" className="text-base leading-none">{tab.icon}</span>
              {t(tab.key)}
            </Link>
          );
        })}
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-gray-500">
          <span aria-hidden="true" className="text-base leading-none">☰</span>
          {t("menu")}
        </button>
      </nav>
    </div>
  );
}
