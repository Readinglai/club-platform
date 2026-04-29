import Link from "next/link";
import { getTranslations } from "next-intl/server";
import ImportForm from "./ImportForm";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function ImportMembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("admin.members");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/members`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          {t("backToMembers")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: PRIMARY }}>
        {t("importTitle")}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        {t("importDesc")}
      </p>

      <ImportForm locale={locale} />
    </div>
  );
}
