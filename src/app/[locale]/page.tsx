/**
 * app/[locale]/page.tsx — 公開首頁（Server Component）
 *
 * 結構：Hero → About → Upcoming Events → Sponsors → Footer
 */

import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const TIER_ORDER = ["platinum", "gold", "silver", "bronze"];
const TIER_LABEL: Record<string, string> = {
  platinum: "白金贊助",
  gold: "黃金贊助",
  silver: "白銀贊助",
  bronze: "銅級贊助",
};

// ─── Hero Section ─────────────────────────────────────────────────────────────

async function HeroSection() {
  const locale = await getLocale();
  let heroImageUrl: string | null = null;
  try {
    const heroConfig = await db.siteConfig.findUnique({ where: { key: "heroImageUrl" } });
    heroImageUrl = heroConfig?.value ?? "/assets/hero.jpg";
  } catch {
    heroImageUrl = "/assets/hero.jpg";
  }
  return <HeroClient heroImageUrl={heroImageUrl} locale={locale} />;
}

// Inline client-like hero rendered as server (no interactivity needed)
function HeroClient({ heroImageUrl, locale }: { heroImageUrl: string | null; locale: string }) {
  return (
    <section
      className="relative flex flex-col items-center justify-center text-center px-4 py-28 sm:py-40 overflow-hidden"
      style={heroImageUrl ? {} : { backgroundColor: PRIMARY }}
      aria-label="Hero section"
    >
      {/* Background image */}
      {heroImageUrl && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0" style={{ backgroundColor: `${PRIMARY}cc` }} />
        </>
      )}

      {/* Subtle radial overlay */}
      {!heroImageUrl && (
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, #c9b99a 0%, transparent 50%), radial-gradient(circle at 80% 20%, #c9b99a 0%, transparent 40%)",
          }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
        <h1 className="text-5xl sm:text-7xl font-bold tracking-[0.15em]" style={{ color: SECONDARY }}>
          ROCSAUT
        </h1>
        <p className="text-lg sm:text-xl font-light tracking-wide" style={{ color: `${SECONDARY}cc` }}>
          多倫多大學台灣學生社群
        </p>
        <p className="text-sm sm:text-base leading-relaxed max-w-md" style={{ color: `${SECONDARY}99` }}>
          連結在多倫多的台灣學生，共同成長、互相支持。
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <a
            href="#about"
            className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ backgroundColor: SECONDARY, color: PRIMARY }}
          >
            了解更多
          </a>
          <Link
            href={`/${locale}/contact`}
            className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide border transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{ borderColor: `${SECONDARY}88`, color: `${SECONDARY}cc` }}
          >
            聯絡我們
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true" style={{ color: `${SECONDARY}55` }}>
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
  return (
    <section id="about" className="px-4 py-20 sm:py-28" style={{ backgroundColor: "#f9f7f4" }} aria-label="About section">
      <div className="max-w-3xl mx-auto flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide" style={{ color: PRIMARY }}>{t("title")}</h2>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: SECONDARY }} />
        </div>
        <div className="flex flex-col gap-5 text-center">
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#555" }}>{t("paragraph1")}</p>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#555" }}>{t("paragraph2")}</p>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: "#555" }}>{t("paragraph3")}</p>
        </div>
        <div className="grid grid-cols-3 gap-6 mt-4 w-full">
          {[{ label: "成員", value: "100+" }, { label: "活動", value: "50+" }, { label: "成立", value: "2020" }].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1 p-4 rounded-xl" style={{ backgroundColor: "#fff", boxShadow: "0 1px 8px #0001" }}>
              <span className="text-2xl font-bold" style={{ color: PRIMARY }}>{value}</span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Upcoming Events Section ──────────────────────────────────────────────────

async function UpcomingEventsSection() {
  const locale = await getLocale();
  let events: { id: string; title: string; startAt: Date; endAt: Date | null; location: string | null; capacity: number | null }[] = [];
  try {
    events = await db.event.findMany({
      where: { published: true, startAt: { gt: new Date() } },
      orderBy: { startAt: "asc" },
      take: 3,
      select: { id: true, title: true, startAt: true, endAt: true, location: true, capacity: true },
    });
  } catch {
    // DB unreachable or table missing — skip section
  }

  if (events.length === 0) return null;

  return (
    <section className="px-4 py-20 sm:py-28 bg-white" aria-label="Upcoming Events">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide" style={{ color: PRIMARY }}>即將到來的活動</h2>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: SECONDARY }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {events.map((ev) => {
            const dateStr = ev.startAt.toLocaleDateString("zh-TW", { year: "numeric", month: "long", day: "numeric", timeZone: "America/Toronto" });
            const timeStr = ev.startAt.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" });
            return (
              <div key={ev.id} className="rounded-2xl border flex flex-col gap-3 p-6 hover:shadow-md transition-shadow" style={{ borderColor: `${SECONDARY}44` }}>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: SECONDARY }}>{dateStr} {timeStr}</p>
                <h3 className="text-base font-bold leading-snug" style={{ color: PRIMARY }}>{ev.title}</h3>
                {ev.location && (
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {ev.location}
                  </p>
                )}
                {ev.capacity && (
                  <p className="text-xs text-gray-400">名額：{ev.capacity} 人</p>
                )}
                <Link
                  href={`/${locale}/events/${ev.id}`}
                  className="mt-auto inline-block text-xs font-semibold px-4 py-2 rounded-lg text-center transition-all hover:opacity-80"
                  style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                >
                  了解詳情
                </Link>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <Link href={`/${locale}/events`} className="text-sm font-semibold transition-opacity hover:opacity-70" style={{ color: PRIMARY }}>
            查看所有活動 →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Sponsors Section ─────────────────────────────────────────────────────────

async function SponsorsSection() {
  let sponsors: { id: string; name: string; logoUrl: string | null; website: string | null; description: string | null; createdAt: Date; updatedAt: Date; histories: { id: string; sponsorId: string; year: number; tier: string; createdAt: Date }[] }[] = [];
  try {
    sponsors = await db.sponsor.findMany({
      where: { histories: { some: {} } },
      include: { histories: { orderBy: { year: "desc" }, take: 1 } },
      orderBy: { name: "asc" },
    });
  } catch {
    // DB unreachable — skip section
  }

  if (sponsors.length === 0) return null;

  type SponsorWithHistory = (typeof sponsors)[number];
  // Group by most-recent tier
  const byTier: Record<string, SponsorWithHistory[]> = {};
  for (const s of sponsors) {
    const tier = s.histories[0]?.tier ?? "bronze";
    if (!byTier[tier]) byTier[tier] = [];
    byTier[tier].push(s);
  }

  return (
    <section className="px-4 py-20 sm:py-28" style={{ backgroundColor: "#f9f7f4" }} aria-label="Sponsors">
      <div className="max-w-5xl mx-auto flex flex-col gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-wide" style={{ color: PRIMARY }}>贊助商</h2>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: SECONDARY }} />
          <p className="text-sm text-gray-500">感謝所有支持我們的贊助商</p>
        </div>
        {TIER_ORDER.filter((t) => byTier[t]?.length).map((tier) => (
          <div key={tier} className="flex flex-col gap-5">
            <h3 className="text-center text-xs font-semibold uppercase tracking-widest" style={{ color: `${PRIMARY}88` }}>
              {TIER_LABEL[tier]}
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-8">
              {byTier[tier].map((s) => (
                <a
                  key={s.id}
                  href={s.website ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center transition-opacity hover:opacity-70"
                  title={s.name}
                >
                  {s.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.logoUrl}
                      alt={s.name}
                      className="object-contain"
                      style={{ height: tier === "platinum" ? 64 : tier === "gold" ? 52 : 40, maxWidth: 160 }}
                    />
                  ) : (
                    <span className="text-sm font-semibold" style={{ color: PRIMARY }}>{s.name}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ backgroundColor: PRIMARY, color: `${SECONDARY}cc` }}>
      <div className="max-w-5xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
        {/* About */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Image src="/assets/logo.png" alt="ROCSAUT" width={28} height={28} className="object-contain" />
            <span className="font-bold tracking-widest text-sm" style={{ color: SECONDARY }}>ROCSAUT</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: `${SECONDARY}99` }}>
            ROCSAUT 是多倫多大學的台灣學生社群，致力於連結在多倫多的台灣學生，共同成長、互相支持。
          </p>
        </div>

        {/* Social Links */}
        <div className="flex flex-col gap-3 sm:items-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: SECONDARY }}>Social</p>
          <div className="flex items-center gap-4">
            {/* Instagram */}
            <a href="https://www.instagram.com/rocsaut/" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" aria-label="Instagram">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            {/* Facebook */}
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

      {/* Bottom bar */}
      <div className="border-t px-6 py-4 text-center text-xs" style={{ borderColor: `${SECONDARY}22`, color: `${SECONDARY}55` }}>
        © 2025 ROCSAUT · Developed by Foster Teng
      </div>
    </footer>
  );
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

export default async function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <UpcomingEventsSection />
      <SponsorsSection />
      <Footer />
    </>
  );
}
