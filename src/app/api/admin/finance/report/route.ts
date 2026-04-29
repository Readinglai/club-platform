import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : new Date().getFullYear();
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : null;

  const dateFilter = month
    ? { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
    : { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };

  const records = await db.financeRecord.findMany({
    where: { date: dateFilter },
    select: { type: true, amount: true, category: true },
  });

  const totalIncome = records
    .filter((r) => r.type === "INCOME")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalExpense = records
    .filter((r) => r.type === "EXPENSE")
    .reduce((s, r) => s + Number(r.amount), 0);

  // Category breakdown
  const byCategory: Record<string, { income: number; expense: number }> = {};
  for (const r of records) {
    if (!byCategory[r.category]) byCategory[r.category] = { income: 0, expense: 0 };
    if (r.type === "INCOME") byCategory[r.category].income += Number(r.amount);
    else byCategory[r.category].expense += Number(r.amount);
  }

  return NextResponse.json({
    year,
    month: month ?? null,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    count: records.length,
    byCategory,
  });
}
