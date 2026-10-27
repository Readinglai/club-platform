import { requirePagePermission } from "@/lib/access/require";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import SiteConfigForm from "./SiteConfigForm";
import SiteConfigManager from "./SiteConfigManager";
import TeamContactsEditor from "./TeamContactsEditor";
import WebsiteFrame from "../WebsiteFrame";

export default async function SiteSettingsPage() {
  await requirePagePermission("content.manage");
  const t = await getTranslations("admin.siteConfig");

  const [heroRecord, flags, templates, sectionsRow, teamContactsRow] = await Promise.all([
    db.siteConfig.findUnique({ where: { key: "heroImageUrl" } }).catch(() => null),
    db.featureFlag.findMany({ orderBy: { key: "asc" } }).catch(() => []),
    db.emailTemplate.findMany({ orderBy: { key: "asc" } }).catch(() => []),
    db.siteConfig.findUnique({ where: { key: "sections" } }).catch(() => null),
    db.siteConfig.findUnique({ where: { key: "teamContacts" } }).catch(() => null),
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

  let initialTeamContacts: { title: string; name: string; email: string }[] = [];
  try {
    if (teamContactsRow?.value) {
      const parsed = JSON.parse(teamContactsRow.value) as typeof initialTeamContacts;
      if (Array.isArray(parsed)) initialTeamContacts = parsed;
    }
  } catch { /* use empty */ }

  return (
    <WebsiteFrame title={t("title")} subtitle={t("subtitle")}>
      <div className="flex flex-col gap-6">
        <SiteConfigForm heroImageUrl={heroRecord?.value ?? ""} />
        <SiteConfigManager
          initialFlags={flags}
          initialTemplates={templates}
          initialSections={sections}
        />
        <TeamContactsEditor initialContacts={initialTeamContacts} />
      </div>
    </WebsiteFrame>
  );
}
