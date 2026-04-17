/**
 * departments/page.tsx — 部門總覽頁
 *
 * 列出所有部門及其成員數，提供連結進入單一部門管理頁。
 */

import { db } from "@/lib/db";
import Link from "next/link";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const departments = await db.department.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8" style={{ color: PRIMARY }}>
        部門總覽
      </h1>

      {departments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">尚無部門資料</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Link
              key={dept.id}
              href={`/exec/departments/${dept.slug}`}
              className="block rounded-2xl border p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
              style={{ borderColor: `${SECONDARY}44`, backgroundColor: "white" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold mb-1" style={{ color: PRIMARY }}>
                    {dept.name}
                  </h2>
                  {dept.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{dept.description}</p>
                  )}
                </div>
                <span
                  className="ml-4 shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: `${PRIMARY}12`, color: PRIMARY }}
                >
                  {dept._count.members} 人
                </span>
              </div>
              <div
                className="mt-4 text-xs font-medium"
                style={{ color: SECONDARY }}
              >
                查看成員 →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
