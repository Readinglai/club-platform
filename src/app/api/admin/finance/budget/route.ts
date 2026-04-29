import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : null;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : null;

  const budgets = await db.budget.findMany({
    where: {
      ...(year ? { year } : {}),
      ...(month ? { month } : {}),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { category: "asc" }],
  });

  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { year, month, category, amount, currency } = body as Record<string, unknown>;

  if (!year || !month || typeof category !== "string" || !category.trim() || !amount) {
    return NextResponse.json({ error: "year、month、category、amount 均為必填" }, { status: 400 });
  }

  const budget = await db.budget.upsert({
    where: { year_month_category: { year: Number(year), month: Number(month), category: category.trim() } },
    create: {
      year: Number(year),
      month: Number(month),
      category: category.trim(),
      amount: Number(amount),
      currency: typeof currency === "string" ? currency : "CAD",
    },
    update: {
      amount: Number(amount),
      ...(currency ? { currency: currency as string } : {}),
    },
  });

  return NextResponse.json(budget, { status: 201 });
}
