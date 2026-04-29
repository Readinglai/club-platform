/**
 * app/[locale]/page.tsx — 公開首頁（Server Component）
 *
 * 結構：Hero → About → Upcoming Events → Sponsors → Footer
 */

import { useTranslations } from "next-intl";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { FadeIn } from "@/components/motion/FadeIn";
import { MotionCard } from "@/components/motion/MotionCard";
import { MotionLogo } from "@/components/motion/MotionLogo";
import { SponsorLogoImg } from "@/components/motion/SponsorLogoImg";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const TIER_ORDER = ["platinum", "gold", "silver", "bronze"] as const;
type Tier = (typeof TIER_ORDER)[number];

function getBaseUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

// ─── Hero Section ─────────────────────────────────────────────────────────────

async function HeroSection() {
  const locale = await getLocale();
  let heroImageUrl: string | null = null;
  try {
    const res = await fetch(`${getBaseUrl()}/api/site-config`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const config = (await res.json()) as Record<string, string>;
      const rawUrl = config["heroImageUrl"]?.trim() ?? "";
      heroImageUrl = /^(https?:\/\/|\/)/.test(rawUrl) ? rawUrl : null;
    }
  } catch {
    heroImageUrl = null;
  }
  return <HeroClient heroImageUrl={heroImageUrl} locale={locale} />;
}

function HeroClient({ heroImageUrl, locale }: { heroImageUrl: string | null; locale: string }) {
  const t = useTranslations("hero");
  return (
    <section
      className="relative flex items-center min-h-screen px-8 sm:px-16 lg:px-24 py-20 overflow-hidden"
      style={{
        backgroundColor: PRIMARY,
        ...(heroImageUrl && {
          backgroundImage: `url("${heroImageUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }),
      }}
      aria-label="Hero section"
    >
      {heroImageUrl && (
        <div className="absolute inset-0" style={{ backgroundColor: `${PRIMARY}d4` }} />
      )}

      {/* Subtle atmospheric glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 75% 40%, rgba(201,185,154,0.07) 0%, transparent 55%), radial-gradient(ellipse at 5% 85%, rgba(201,185,154,0.04) 0%, transparent 45%)",
        }}
      />

      {/* Left-aligned content */}
      <div className="relative z-10 flex flex-col gap-7 max-w-3xl">
        <FadeIn direction="down" delay={0}>
          <div className="flex items-stretch gap-6">
            <div className="w-1.5 rounded-full shrink-0" style={{ backgroundColor: SECONDARY }} />
            <h1
              className="text-7xl sm:text-9xl font-black leading-none"
              style={{ color: SECONDARY }}
            >
              ROCSAUT
            </h1>
          </div>
        </FadeIn>

        <FadeIn delay={0.18}>
          <p
            className="text-xl sm:text-2xl font-light leading-snug pl-7"
            style={{ color: `${SECONDARY}dd` }}
          >
            {t("subtitle")}
          </p>
        </FadeIn>

        <FadeIn delay={0.32}>
          <p
            className="text-base leading-relaxed max-w-lg pl-7"
            style={{ color: `${SECONDARY}88` }}
          >
            {t("description")}
          </p>
        </FadeIn>

        <FadeIn direction="up" delay={0.5}>
          <div className="flex flex-row items-center gap-4 mt-1 pl-7 flex-wrap">
            <a
              href="#about"
              className="px-10 py-4 rounded-2xl text-sm font-bold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: SECONDARY, color: PRIMARY }}
            >
              {t("ctaPrimary")}
            </a>
            <Link
              href={`/${locale}/contact`}
              className="px-10 py-4 rounded-2xl text-sm font-bold tracking-wide border transition-all duration-200 hover:bg-white/5 active:scale-95"
              style={{ borderColor: `${SECONDARY}66`, color: `${SECONDARY}cc` }}
            >
              {t("ctaSecondary")}
            </Link>
          </div>
        </FadeIn>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
        aria-hidden="true"
        style={{ color: `${SECONDARY}44` }}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

// ─── About Section ────────────────────────────────────────────────────────────

function AboutSection() {
  const t = useTranslations("about");
  const tHome = useTranslations("home");

  const stats = [
    { key: "statMembers", value: "100+" },
    { key: "statEvents", value: "50+" },
    { key: "statFounded", value: "1993" },
  ] as const;

  const features = [
    { emoji: "🎉", titleKey: "feature1Title" as const, descKey: "feature1Desc" as const },
    { emoji: "🤝", titleKey: "feature2Title" as const, descKey: "feature2Desc" as const },
    { emoji: "🌏", titleKey: "feature3Title" as const, descKey: "feature3Desc" as const },
  ];

  return (
    <section
      id="about"
      className="px-4 py-16 sm:py-24"
      style={{ backgroundColor: "#f9f7f4" }}
      aria-label="About section"
    >
      <div className="max-w-6xl mx-auto">
        {/* Two-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          {/* Left: title + icon feature cards */}
          <FadeIn delay={0}>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div className="w-1.5 h-14 rounded-full" style={{ backgroundColor: SECONDARY }} />
                <h2
                  className="text-4xl sm:text-5xl font-extrabold leading-tight"
                  style={{ color: PRIMARY }}
                >
                  {t("title")}
                </h2>
              </div>

              {/* Feature icon cards */}
              <div className="flex flex-col gap-4">
                {features.map(({ emoji, titleKey, descKey }, i) => (
                  <FadeIn key={titleKey} delay={0.1 + i * 0.1}>
                    <div className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: SECONDARY }}
                      >
                        {emoji}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-bold" style={{ color: PRIMARY }}>
                          {t(titleKey)}
                        </p>
                        <p className="text-xs leading-relaxed" style={{ color: "#777" }}>
                          {t(descKey)}
                        </p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </FadeIn>

          {/* Right: paragraphs */}
          <div className="flex flex-col gap-6 pt-2">
            <FadeIn delay={0.1}>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#555" }}>
                {t("paragraph1")}
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#555" }}>
                {t("paragraph2")}
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#555" }}>
                {t("paragraph3")}
              </p>
            </FadeIn>
          </div>
        </div>

        {/* Stats — full-width dark blue band */}
        <div className="mt-16 rounded-2xl overflow-hidden" style={{ backgroundColor: PRIMARY }}>
          <div className="grid grid-cols-3">
            {stats.map(({ key, value }, si) => (
              <FadeIn key={key} direction="up" delay={0.1 + si * 0.1}>
                <div
                  className="flex flex-col items-center gap-2 py-10 px-4"
                  style={si < 2 ? { borderRight: `1px solid ${SECONDARY}22` } : {}}
                >
                  <span
                    className="text-5xl sm:text-6xl font-black"
                    style={{ color: SECONDARY }}
                  >
                    {value}
                  </span>
                  <span
                    className="text-xs uppercase tracking-widest font-semibold"
                    style={{ color: `${SECONDARY}66` }}
                  >
                    {tHome(key)}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Upcoming Events Section ──────────────────────────────────────────────────

interface EventItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  location: string | null;
  capacity: number | null;
  imageUrl: string | null;
}

async function UpcomingEventsSection() {
  const locale = await getLocale();
  const t = await getTranslations("home");
  const tEvents = await getTranslations("events");
  let events: EventItem[] = [];
  try {
    const res = await fetch(`${getBaseUrl()}/api/events?upcoming=true&limit=3`, {
      cache: "no-store",
    });
    if (res.ok) events = (await res.json()) as EventItem[];
  } catch {
    // DB unreachable or table missing — skip section
  }

  if (events.length === 0) return null;

  return (
    <section
      className="px-4 py-16 sm:py-24"
      style={{ backgroundColor: PRIMARY }}
      aria-label="Upcoming Events"
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        {/* Section heading */}
        <FadeIn>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2
              className="text-4xl sm:text-5xl font-extrabold"
              style={{ color: SECONDARY }}
            >
              {t("upcomingEventsTitle")}
            </h2>
            <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: `${SECONDARY}88` }} />
          </div>
        </FadeIn>

        {/* One full-width row per event */}
        <div className="flex flex-col gap-6">
          {events.map((ev, idx) => {
            const startAt = new Date(ev.startAt);
            const dateStr = startAt.toLocaleDateString(
              locale === "en" ? "en-CA" : "zh-TW",
              { year: "numeric", month: "long", day: "numeric", timeZone: "America/Toronto" }
            );
            const timeStr = startAt.toLocaleTimeString(
              locale === "en" ? "en-CA" : "zh-TW",
              { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" }
            );

            return (
              <FadeIn key={ev.id} delay={idx * 0.1}>
                <div
                  className="group grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-white/[0.10] overflow-hidden transition-colors duration-300 hover:border-[#c9b99a]"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  {/* Left: image or placeholder */}
                  <Link
                    href={`/${locale}/events/${ev.id}`}
                    className="relative block overflow-hidden"
                    style={{ minHeight: "220px" }}
                  >
                    {ev.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ev.imageUrl}
                          alt={ev.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-[#1a2744]/0 group-hover:bg-[#1a2744]/40 transition-all duration-300" />
                      </>
                    ) : (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                        style={{ backgroundColor: `${PRIMARY}` }}
                      >
                        <span className="text-5xl opacity-20" aria-hidden="true">📅</span>
                        <span
                          className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: `${SECONDARY}55` }}
                        >
                          {dateStr}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Right: event details */}
                  <div className="flex flex-col justify-center gap-4 p-8">
                    <p
                      className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: SECONDARY }}
                    >
                      {dateStr} · {timeStr}
                    </p>
                    <h3
                      className="text-3xl font-bold leading-snug"
                      style={{ color: "#fff" }}
                    >
                      {ev.title}
                    </h3>
                    {ev.location && (
                      <p
                        className="text-sm flex items-center gap-2"
                        style={{ color: `${SECONDARY}bb` }}
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {ev.location}
                      </p>
                    )}
                    {ev.capacity && (
                      <p className="text-sm" style={{ color: `${SECONDARY}66` }}>
                        {t("capacityFormat", { count: ev.capacity })}
                      </p>
                    )}
                    <div className="mt-2">
                      <Link
                        href={`/${locale}/events/${ev.id}`}
                        className="inline-block text-sm font-bold px-6 py-3 rounded-xl transition-all hover:opacity-80 active:scale-95"
                        style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                      >
                        {tEvents("readMore")} →
                      </Link>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        <div className="text-center">
          <Link
            href={`/${locale}/events`}
            className="text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ color: `${SECONDARY}bb` }}
          >
            {t("viewAllEvents")}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Sponsors Section ─────────────────────────────────────────────────────────

interface SponsorHistory {
  id: string;
  sponsorId: string;
  year: number;
  tier: string;
  createdAt: string;
}

interface SponsorItem {
  id: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  description: string | null;
  histories: SponsorHistory[];
}

async function SponsorsSection() {
  const t = await getTranslations("sponsors");
  let sponsors: SponsorItem[] = [];
  try {
    const res = await fetch(`${getBaseUrl()}/api/sponsors`, {
      cache: "no-store",
    });
    if (res.ok) {
      const all = (await res.json()) as SponsorItem[];
      sponsors = all.filter((s) => s.histories.length > 0);
    }
  } catch {
    // DB unreachable — skip section
  }

  if (sponsors.length === 0) return null;

  const logoHeight: Record<string, number> = {
    platinum: 120,
    gold: 96,
    silver: 72,
    bronze: 56,
  };

  // Group by most-recent tier
  const byTier: Record<string, SponsorItem[]> = {};
  for (const s of sponsors) {
    const tier = s.histories[0]?.tier ?? "bronze";
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push(s);
  }

  return (
    <section
      className="px-4 py-16 sm:py-24"
      style={{ backgroundColor: "#f9f7f4" }}
      aria-label="Sponsors"
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-12">
        <FadeIn>
          <div className="flex flex-col items-center gap-3 text-center">
            <h2
              className="text-4xl sm:text-5xl font-extrabold"
              style={{ color: PRIMARY }}
            >
              {t("title")}
            </h2>
            <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: SECONDARY }} />
            <p className="text-sm text-gray-500">{t("subtitle")}</p>
          </div>
        </FadeIn>

        {TIER_ORDER.filter((tier) => byTier[tier]?.length).map((tier, ti) => (
          <FadeIn key={tier} delay={ti * 0.15}>
            <div className="flex flex-col gap-6">
              <div className="flex justify-center">
                <span
                  className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full"
                  style={{ backgroundColor: SECONDARY, color: PRIMARY }}
                >
                  {t(tier)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 items-center">
                {byTier[tier].map((s) => (
                  <MotionLogo
                    key={s.id}
                    href={s.website ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center py-5"
                    title={s.name}
                  >
                    {s.logoUrl ? (
                      <SponsorLogoImg
                        src={s.logoUrl}
                        alt={s.name}
                        height={logoHeight[tier] ?? 56}
                        maxWidth={200}
                      />
                    ) : (
                      <span className="text-sm font-semibold" style={{ color: PRIMARY }}>
                        {s.name}
                      </span>
                    )}
                  </MotionLogo>
                ))}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const t = useTranslations("home");
  return (
    <FadeIn direction="up">
      <footer style={{ backgroundColor: PRIMARY, color: `${SECONDARY}cc` }}>
        <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
          {/* About */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Image src="/assets/logo.png" alt="ROCSAUT" width={28} height={28} className="object-contain" />
              <span className="font-black tracking-widest text-sm" style={{ color: SECONDARY }}>ROCSAUT</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: `${SECONDARY}99` }}>
              {t("footerDescription")}
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-col gap-3 sm:items-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: SECONDARY }}>Social</p>
            <div className="flex items-center gap-4">
              <a href="https://www.instagram.com/rocsaut/" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" aria-label="Instagram">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://www.facebook.com/rocsaut" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" aria-label="Facebook">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-3 sm:items-end">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: SECONDARY }}>Location</p>
            <address className="not-italic text-xs leading-relaxed text-right" style={{ color: `${SECONDARY}99` }}>
              University of Toronto<br />
              27 King&apos;s College Cir<br />
              Toronto, ON M5S 1A1
            </address>
          </div>
        </div>

        <div
          className="border-t px-6 py-4 text-center text-xs"
          style={{ borderColor: `${SECONDARY}22`, color: `${SECONDARY}55` }}
        >
          © 2025 ROCSAUT
        </div>
      </footer>
    </FadeIn>
  );
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface SectionConfig {
  key: string;
  visible: boolean;
  order: number;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { key: "hero", visible: true, order: 0 },
  { key: "about", visible: true, order: 1 },
  { key: "upcoming_events", visible: true, order: 2 },
  { key: "sponsors", visible: true, order: 3 },
];

async function getSectionsConfig(): Promise<SectionConfig[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/admin/site-config?key=sections`, {
      cache: "no-store",
    });
    if (res.ok) {
      const { value } = await res.json();
      if (value) {
        const parsed = JSON.parse(value) as SectionConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch { /* use defaults */ }
  return DEFAULT_SECTIONS;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sections = await getSectionsConfig();
  const ordered = [...sections].sort((a, b) => a.order - b.order);
  const visible = new Set(ordered.filter((s) => s.visible).map((s) => s.key));
  const sectionOrder = ordered.map((s) => s.key);

  return (
    <>
      {sectionOrder.map((key) => {
        if (!visible.has(key)) return null;
        if (key === "hero") return <HeroSection key="hero" />;
        if (key === "about") return <AboutSection key="about" />;
        if (key === "upcoming_events") return <UpcomingEventsSection key="upcoming_events" />;
        if (key === "sponsors") return <SponsorsSection key="sponsors" />;
        return null;
      })}
      <Footer />
    </>
  );
}
