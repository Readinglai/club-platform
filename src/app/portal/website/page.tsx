import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { can, getAccess } from "@/lib/access/can";
import { getCurrentUser } from "@/lib/access/current-user";
import WebsiteFrame from "./WebsiteFrame";

const PRIMARY = "#1a2744";
/** Members page and Achievements: Ops VP + Website group; memories: Events VP + Website group; the rest: any VP. */
const SECTIONS = [
  { key: "team", permission: "showcase.manage" },
  { key: "memories", permission: "memories.manage" },
  { key: "achievements", permission: "showcase.manage" },
  { key: "sponsors", permission: "content.manage" },
  { key: "alumni", permission: "content.manage" },
  { key: "settings", permission: "content.manage" },
  { key: "text", permission: "content.manage" },
] as const;

export default async function WebsitePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const access = await getAccess(user.id);
  const sections = SECTIONS.filter((s) => can(access, s.permission)).map((s) => s.key);
  if (sections.length === 0) redirect("/portal");
  const t = await getTranslations("portal.websitePage");

  return (
    <WebsiteFrame title={t("title")} subtitle={t("intro")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((key) => (
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
