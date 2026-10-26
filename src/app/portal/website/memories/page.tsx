import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { listEventsForMemories } from "@/lib/events/memories";
import WebsiteFrame from "../WebsiteFrame";

const PRIMARY = "#1a2744";

export default async function MemoriesList() {
  await requirePagePermission("memories.manage");
  const [t, locale, events] = await Promise.all([getTranslations("portal.memoriesEditor"), getLocale(), listEventsForMemories()]);
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";

  return (
    <WebsiteFrame title={t("title")} subtitle={t("intro")}>
      {events.length === 0 ? (
        <p className="text-sm text-gray-600">{t("noEvents")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/portal/website/memories/${e.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{e.title}</span>
                  <span className="text-xs text-gray-500">{e.startAt.toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" })}</span>
                </span>
                <span className="shrink-0 text-xs" style={{ color: e.photos || e.hasRecap ? PRIMARY : "#6b7280" }}>
                  {e.photos || e.hasRecap ? t("summary", { photos: e.photos }) : t("none")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WebsiteFrame>
  );
}
