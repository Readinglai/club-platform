import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import EventEditForm from "./EventEditForm";
import RegistrationsTable from "./RegistrationsTable";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale, id } = await params;
  const t = await getTranslations("admin.events");

  const event = await db.event.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!event) notFound();

  const registeredCount = event.registrations.filter((r) => r.status === "REGISTERED").length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/events`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          {t("backToEvents")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8" style={{ color: PRIMARY }}>
        {t("editTitle")}
      </h1>

      <EventEditForm
        event={{
          id: event.id,
          title: event.title,
          description: event.description,
          startAt: event.startAt.toISOString(),
          endAt: event.endAt?.toISOString() ?? null,
          location: event.location,
          capacity: event.capacity,
          published: event.published,
        }}
        locale={locale}
      />

      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: PRIMARY }}>
          {t("registrationsTitle", { registered: registeredCount, total: event.registrations.length })}
        </h2>
        <RegistrationsTable
          eventId={event.id}
          registrations={event.registrations.map((r) => ({
            id: r.id,
            status: r.status,
            attendedAt: r.attendedAt?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
            user: { name: r.user.name ?? "—", email: r.user.email },
          }))}
        />
      </div>
    </div>
  );
}
