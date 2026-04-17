import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AttendanceList from "./AttendanceList";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await params;

  const events = await db.event.findMany({
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      registrations: {
        select: {
          id: true,
          status: true,
          attendedAt: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const data = events.map((e) => {
    // Denominator: REGISTERED only (CANCELLED excluded).
    const registered = e.registrations.filter((r) => r.status === "REGISTERED");
    const total = registered.length;
    const attended = registered.filter((r) => r.attendedAt !== null).length;
    return {
      id: e.id,
      title: e.title,
      startAt: e.startAt.toISOString(),
      totalRegistrations: total,
      attended,
      attendanceRate: total > 0 ? Math.round((attended / total) * 100) : 0,
      registrations: e.registrations.map((r) => ({
        id: r.id,
        status: r.status,
        attended: r.attendedAt !== null,
        attendedAt: r.attendedAt?.toISOString() ?? null,
        userName: r.user.name,
        userEmail: r.user.email,
      })),
    };
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>
          出席記錄管理
        </h1>
        <p className="text-sm text-gray-500 mt-1">點擊活動名稱展開報名者出席狀態</p>
      </div>
      <AttendanceList events={data} />
    </div>
  );
}
