import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "@/lib/access/require";
import { getPublicTeam } from "@/lib/team/public";
import WebsiteFrame from "../WebsiteFrame";
import TeamPageEditor from "./TeamPageEditor";

export default async function TeamPageAdmin() {
  await requirePagePermission("showcase.manage");
  const [t, departments] = await Promise.all([getTranslations("portal.teamPageEditor"), getPublicTeam({ includeHidden: true })]);
  return (
    <WebsiteFrame title={t("title")} subtitle={t("intro")}>
      <TeamPageEditor initial={departments} />
    </WebsiteFrame>
  );
}
