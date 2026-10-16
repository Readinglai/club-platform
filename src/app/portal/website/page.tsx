import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import WebsiteFrame from "./WebsiteFrame";

const PRIMARY = "#1a2744";
const SECTIONS = ["sponsors", "achievements", "alumni", "settings", "text"] as const;

export default async function WebsitePage() {
  await requirePagePermission("content.manage");
  const t = await getTranslations("portal.websitePage");

  return (
    <WebsiteFrame title={t("title")} subtitle={t("intro")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((key) => (
          <Link
            key={key}
            href={`/portal/website/${key}`}
            className="rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <h2 className="font-semibold" style={{ color: PRIMARY }}>{t(`${key}Title`)}</h2>
            <p className="mt-1 text-sm text-gray-500">{t(`${key}Text`)}</p>
          </Link>
        ))}
      </div>
    </WebsiteFrame>
  );
}
