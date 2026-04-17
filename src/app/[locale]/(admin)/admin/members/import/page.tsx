import Link from "next/link";
import ImportForm from "./ImportForm";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function ImportMembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/members`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          ← 成員列表
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-2" style={{ color: PRIMARY }}>
        批次匯入成員
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        已存在的 email 會更新姓名、角色與部門；新的 email 會建立帳號。
      </p>

      <ImportForm locale={locale} />
    </div>
  );
}
