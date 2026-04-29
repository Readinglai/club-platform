import { db } from "@/lib/db";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import EventsTable from "./EventsTable";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale } = await params;
  const t = await getTranslations("admin.events");

  const events = await db.event.findMany({
    orderBy: { startAt: "desc" },
    include: { _count: { select: { registrations: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t("count", { count: events.length })}</p>
        </div>
        <Link
          href={`/${locale}/admin/events/new`}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {t("createButton")}
        </Link>
      </div>

      <EventsTable
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          startAt: e.startAt.toISOString(),
          location: e.location,
          capacity: e.capacity,
          published: e.published,
          registrationCount: e._count.registrations,
        }))}
        locale={locale}
      />
    </div>
  );
}
