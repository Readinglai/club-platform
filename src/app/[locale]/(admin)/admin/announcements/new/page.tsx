import Link from "next/link";
import NewAnnouncementForm from "./NewAnnouncementForm";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function NewAnnouncementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/announcements`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          ← 公告列表
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-8" style={{ color: PRIMARY }}>
        建立新公告
      </h1>
      <NewAnnouncementForm locale={locale} />
    </div>
  );
}
