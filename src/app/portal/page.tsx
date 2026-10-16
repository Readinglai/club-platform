import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getPortalSections } from "@/lib/access/portal-nav";
import { isProfileComplete } from "@/lib/membership/profile";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Everyone fills in their details once before using the portal.
  if (!(await isProfileComplete(user.id))) redirect("/portal/complete-profile");

  const [t, nav, sections] = await Promise.all([
    getTranslations("portal.homePage"),
    getTranslations("portal"),
    getPortalSections(user.id),
  ]);

  const cards = [
    { href: "/portal/membership", title: nav("membership"), text: t("membershipText") },
    sections.events && { href: "/portal/events", title: nav("events"), text: t("eventsText") },
    sections.team && { href: "/portal/team", title: nav("team"), text: t("teamText") },
    sections.approvals && { href: "/portal/approvals", title: nav("approvals"), text: t("approvalsText") },
    sections.finance && { href: "/portal/finance", title: nav("finance"), text: t("financeText") },
    { href: "/portal/profile", title: nav("profile"), text: t("profileText") },
  ].filter((card): card is { href: string; title: string; text: string } => Boolean(card));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <section className="px-4 py-12" style={{ backgroundColor: PRIMARY }}>
        <div className="mx-auto max-w-3xl">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest" style={{ color: `${SECONDARY}99` }}>
            ROCSAUT
          </p>
          <h1 className="text-2xl font-bold" style={{ color: SECONDARY }}>
            {nav("portalName")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#ffffffaa" }}>
            {t("welcome", { name: user.name || user.email })}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="grid gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>
                {card.title}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>
                {card.text}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
