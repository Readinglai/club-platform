import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : null;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : null;

  const records = await db.financeRecord.findMany({
    where: {
      ...(year || month
        ? {
            date: {
              gte: new Date((year ?? new Date().getFullYear()), (month ?? 1) - 1, 1),
              lt: month
                ? new Date((year ?? new Date().getFullYear()), month, 1)
                : new Date((year ?? new Date().getFullYear()) + 1, 0, 1),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  const header = ["日期", "類型", "金額", "幣別", "類別", "說明", "建立者"].join(",");
  const rows = records.map((r) =>
    [
      new Date(r.date).toISOString().slice(0, 10),
      r.type === "INCOME" ? "收入" : "支出",
      r.amount.toString(),
      r.currency,
      `"${r.category.replace(/"/g, '""')}"`,
      `"${(r.description ?? "").replace(/"/g, '""')}"`,
      `"${r.createdBy.name.replace(/"/g, '""')}"`,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance_${year ?? "all"}_${month ?? "all"}.csv"`,
    },
  });
}
