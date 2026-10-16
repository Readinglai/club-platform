import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getPortalSections } from "@/lib/access/portal-nav";
import { isProfileComplete } from "@/lib/membership/profile";
import { getAttention } from "@/lib/portal/attention";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

type Card = { href: string; title: string; text?: string; tone?: "action" | "info" };

export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Everyone fills in their details once before using the portal.
  if (!(await isProfileComplete(user.id))) redirect("/portal/complete-profile");

  const [t, nav, sections, attention, locale] = await Promise.all([
    getTranslations("portal.homePage"),
    getTranslations("portal"),
    getPortalSections(user.id),
    getAttention(user.id, user.email),
    getLocale(),
  ]);
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";

  const needs: Card[] = [];
  if (attention.approvalsWaiting > 0) {
    needs.push({ href: "/portal/approvals", title: t("approvalsWaiting", { count: attention.approvalsWaiting }), tone: "action" });
  }
  if (attention.openTasks > 0) {
    needs.push({ href: "/portal/tasks", title: t("openTasks", { count: attention.openTasks }), tone: "action" });
  }
  for (const r of attention.reportsToReview) {
    needs.push({ href: `/portal/finance/events/${r.eventId}`, title: t("reviewReport", { title: r.title }), tone: "action" });
  }
  for (const r of attention.reportsReturned) {
    needs.push({ href: `/portal/finance/events/${r.eventId}`, title: t("reportReturned", { title: r.title }), tone: "action" });
  }
  if (attention.membership.state === "none") {
    needs.push({ href: "/portal/membership", title: t("joinTitle"), text: t("joinText"), tone: "info" });
  } else if (attention.membership.endsSoon) {
    const date = new Date(attention.membership.termEnd).toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" });
    needs.push({ href: "/portal/membership", title: t("renewTitle", { date }), text: t("renewText"), tone: "action" });
  }
  if (attention.nextTicket) {
    const tk = attention.nextTicket;
    const when = new Date(tk.startAt).toLocaleString(dateLocale, { timeZone: tk.timezone, dateStyle: "medium", timeStyle: "short" });
    needs.push({ href: "/portal/tickets", title: t("nextEvent", { title: tk.eventTitle }), text: t("nextEventWhen", { when }), tone: "info" });
  }
  if (attention.unreadAnnouncements > 0) {
    needs.push({ href: "/portal/announcements", title: t("unread", { count: attention.unreadAnnouncements }), tone: "info" });
  }

  const links: Card[] = [
    { href: "/portal/tickets", title: nav("tickets") },
    sections.staff && { href: "/portal/tasks", title: nav("tasks") },
    { href: "/portal/membership", title: nav("membership"), text: t("membershipText") },
    sections.events && { href: "/portal/events", title: nav("events"), text: t("eventsText") },
    sections.team && { href: "/portal/team", title: nav("team"), text: t("teamText") },
    sections.approvals && { href: "/portal/approvals", title: nav("approvals"), text: t("approvalsText") },
    sections.finance && { href: "/portal/finance", title: nav("finance"), text: t("financeText") },
    { href: "/portal/profile", title: nav("profile"), text: t("profileText") },
  ].filter((card): card is Card => Boolean(card));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <section className="px-4 py-10" style={{ backgroundColor: PRIMARY }}>
        <div className="mx-auto max-w-3xl">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: `${SECONDARY}99` }}>ROCSAUT</p>
          <h1 className="text-2xl font-bold" style={{ color: SECONDARY }}>{nav("portalName")}</h1>
          <p className="mt-2 text-sm" style={{ color: "#ffffffaa" }}>{t("welcome", { name: user.name || user.email })}</p>
        </div>
      </section>

      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
        <section aria-labelledby="attention-title">
          <h2 id="attention-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t("attentionTitle")}</h2>
          {needs.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">✓ {t("allClear")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {needs.map((card, i) => (
                <li key={`${card.href}-${i}`}>
                  <Link
                    href={card.href}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm"
                    style={{ borderLeft: `4px solid ${card.tone === "action" ? PRIMARY : SECONDARY}` }}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold" style={{ color: PRIMARY }}>{card.title}</span>
                      {card.text && <span className="block text-xs text-gray-600">{card.text}</span>}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-gray-400">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="links-title">
          <h2 id="links-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{t("quickLinks")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                style={{ border: "1px solid #e5e7eb" }}
              >
                <h3 className="font-semibold" style={{ color: PRIMARY }}>{card.title}</h3>
                {card.text && <p className="mt-1 text-sm text-gray-500">{card.text}</p>}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
