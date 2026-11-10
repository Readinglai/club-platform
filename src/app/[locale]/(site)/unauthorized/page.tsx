import Link from "next/link";
import { getTranslations } from "next-intl/server";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function UnauthorizedPage() {
  const t = await getTranslations("errors");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: PRIMARY }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl px-8 py-10 flex flex-col items-center gap-6 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: `${PRIMARY}15`, color: PRIMARY }}
        >
          🔒
        </div>

        <div>
          <h1 className="text-xl font-bold mb-2" style={{ color: PRIMARY }}>
            {t("unauthorized")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("unauthorizedDescription")}
          </p>
        </div>

        <Link
          href="/portal/profile"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {t("backToProfile")}
        </Link>
      </div>
    </div>
  );
}
