import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExportButton from "./ExportButton";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

function rateStyle(rate: number) {
  if (rate >= 80) return { color: "#065f46", backgroundColor: "#d1fae5" };
  if (rate >= 50) return { color: "#92400e", backgroundColor: "#fef3c7" };
  return { color: "#991b1b", backgroundColor: "#fee2e2" };
}

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // ── 出席率資料 ──────────────────────────────────────────
  const events = await db.event.findMany({
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      registrations: { select: { attendedAt: true, status: true } },
    },
  });

  const attendanceData = events.map((e) => {
    // Denominator: REGISTERED only (CANCELLED excluded).
    const registered = e.registrations.filter((r) => r.status === "REGISTERED");
    const total = registered.length;
    const attended = registered.filter((r) => r.attendedAt !== null).length;
    return {
      id: e.id,
      title: e.title,
      startAt: e.startAt.toLocaleDateString("zh-TW"),
      total,
      attended,
      rate: total > 0 ? Math.round((attended / total) * 100) : 0,
    };
  });

  // ── 成員成長資料（最近 12 個月）────────────────────────
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const users = await db.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, 0);
  }
  for (const u of users) {
    const key = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const memberData = Array.from(buckets.entries()).map(([month, count]) => ({ month, count }));
  const maxCount = Math.max(...memberData.map((d) => d.count), 1);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>數據報表</h1>

      {/* ── 區塊一：活動出席率 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>活動出席率</h2>
          <ExportButton type="attendance" label="匯出 CSV" />
        </div>

        {attendanceData.length === 0 ? (
          <p className="text-sm text-gray-400">尚無活動資料。</p>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ backgroundColor: `${PRIMARY}08` }}>
                  {["活動名稱", "日期", "報名人數", "出席人數", "出席率"].map((h) => (
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
                {attendanceData.map((e) => {
                  const style = rateStyle(e.rate);
                  return (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>{e.title}</td>
                      <td className="px-4 py-3 text-gray-500">{e.startAt}</td>
                      <td className="px-4 py-3 text-gray-500">{e.total}</td>
                      <td className="px-4 py-3 text-gray-500">{e.attended}</td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={style}
                        >
                          {e.rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 區塊二：成員成長 ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>成員成長（近 12 個月）</h2>
          <ExportButton type="members" label="匯出 CSV" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col gap-3">
            {memberData.map(({ month, count }) => (
              <div key={month} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16 shrink-0">{month}</span>
                <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: `${PRIMARY}0a` }}>
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{
                      width: `${(count / maxCount) * 100}%`,
                      backgroundColor: count === 0 ? "transparent" : SECONDARY,
                      minWidth: count > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span
                  className="text-xs font-semibold w-6 text-right shrink-0"
                  style={{ color: PRIMARY }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>

          {memberData.every((d) => d.count === 0) && (
            <p className="text-xs text-gray-400 text-center mt-4">近 12 個月無新增成員</p>
          )}
        </div>
      </section>
    </div>
  );
}
