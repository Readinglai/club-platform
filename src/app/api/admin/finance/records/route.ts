import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : null;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : null;
  const type = searchParams.get("type") as "INCOME" | "EXPENSE" | null;

  const records = await db.financeRecord.findMany({
    where: {
      ...(year || month
        ? {
            date: {
              gte: new Date(year ?? new Date().getFullYear(), (month ?? 1) - 1, 1),
              lt: month
                ? new Date(year ?? new Date().getFullYear(), month, 1)
                : new Date((year ?? new Date().getFullYear()) + 1, 0, 1),
            },
          }
        : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { date: "desc" },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(records);
}

export async function POST(request: NextRequest) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { type, amount, currency, category, description, date } = body as Record<string, unknown>;

  if (type !== "INCOME" && type !== "EXPENSE") {
    return NextResponse.json({ error: "type 必須為 INCOME 或 EXPENSE" }, { status: 400 });
  }
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "amount 必須為正數" }, { status: 400 });
  }
  if (typeof category !== "string" || !category.trim()) {
    return NextResponse.json({ error: "category 為必填" }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: "date 為必填" }, { status: 400 });
  }

  const record = await db.financeRecord.create({
    data: {
      type: type as "INCOME" | "EXPENSE",
      amount: Number(amount),
      currency: typeof currency === "string" ? currency : "CAD",
      category: (category as string).trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      date: new Date(date as string),
      createdById: guard.userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(record, { status: 201 });
}
