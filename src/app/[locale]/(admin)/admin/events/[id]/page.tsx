import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import EventEditForm from "./EventEditForm";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const STATUS_LABEL: Record<string, string> = {
  REGISTERED: "已報名",
  WAITLISTED: "候補",
  CANCELLED: "已取消",
};

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { locale, id } = await params;

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

  return (
    <div className="max-w-3xl mx-auto">
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
        編輯活動
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

      {/* 報名名單 */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: PRIMARY }}>
          報名名單（{event.registrations.length} 人）
        </h2>

        {event.registrations.length === 0 ? (
          <p className="text-sm text-gray-400">尚無報名記錄。</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
                  {["姓名", "Email", "報名時間", "出席狀態"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                      style={{ color: PRIMARY }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {event.registrations.map((reg) => (
                  <tr key={reg.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>
                      {reg.user.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{reg.user.email}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {reg.createdAt.toLocaleDateString("zh-TW")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={
                          reg.status === "REGISTERED"
                            ? { backgroundColor: "#d1fae5", color: "#065f46" }
                            : reg.status === "WAITLISTED"
                            ? { backgroundColor: "#fef3c7", color: "#92400e" }
                            : { backgroundColor: "#f3f4f6", color: "#6b7280" }
                        }
                      >
                        {STATUS_LABEL[reg.status] ?? reg.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
