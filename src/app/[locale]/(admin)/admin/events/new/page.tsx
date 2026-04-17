import Link from "next/link";
import NewEventForm from "./NewEventForm";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function NewEventPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/events`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          ← 活動列表
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-8" style={{ color: PRIMARY }}>
        建立新活動
      </h1>
      <NewEventForm locale={locale} />
    </div>
  );
}
