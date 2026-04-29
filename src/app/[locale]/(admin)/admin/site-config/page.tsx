import { requireAuth } from "@/lib/auth/guard";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import SiteConfigForm from "./SiteConfigForm";
import SiteConfigManager from "./SiteConfigManager";

export default async function SiteConfigPage() {
  await requireAuth(4);
  const t = await getTranslations("admin.siteConfig");

  const [heroRecord, flags, templates, sectionsRow, reminderRow] = await Promise.all([
    db.siteConfig.findUnique({ where: { key: "heroImageUrl" } }).catch(() => null),
    db.featureFlag.findMany({ orderBy: { key: "asc" } }).catch(() => []),
    db.emailTemplate.findMany({ orderBy: { key: "asc" } }).catch(() => []),
    db.siteConfig.findUnique({ where: { key: "sections" } }).catch(() => null),
    db.siteConfig.findUnique({ where: { key: "reminder_hours_before" } }).catch(() => null),
  ]);

  const defaultSections = [
    { key: "hero", label: t("sectionHeroLabel"), visible: true, order: 0 },
    { key: "about", label: t("sectionAboutLabel"), visible: true, order: 1 },
    { key: "upcoming_events", label: t("sectionUpcomingEventsLabel"), visible: true, order: 2 },
    { key: "sponsors", label: t("sectionSponsorsLabel"), visible: true, order: 3 },
  ];

  let sections = defaultSections;
  if (sectionsRow?.value) {
    try {
      const parsed = JSON.parse(sectionsRow.value) as Array<{ key: string; visible: boolean; order: number }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        sections = defaultSections.map((def) => {
          const found = parsed.find((p) => p.key === def.key);
          return found ? { ...def, visible: found.visible, order: found.order } : def;
        });
        sections.sort((a, b) => a.order - b.order);
      }
    } catch { /* keep defaults */ }
  }

  const reminderHours = reminderRow ? parseInt(reminderRow.value, 10) || 72 : 72;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#1a2744" }}>{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>
      <SiteConfigForm heroImageUrl={heroRecord?.value ?? ""} />
      <SiteConfigManager
        initialFlags={flags}
        initialTemplates={templates}
        initialSections={sections}
        initialReminderHours={reminderHours}
      />
    </div>
  );
}
