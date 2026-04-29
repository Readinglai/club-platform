import { requireAuth } from "@/lib/auth/guard";
import { getTranslations } from "next-intl/server";
import FinanceManager from "./FinanceManager";

export default async function FinancePage() {
  await requireAuth(3);
  const t = await getTranslations("admin.finance");
  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#1a2744" }}>{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>
      <FinanceManager />
    </div>
  );
}
