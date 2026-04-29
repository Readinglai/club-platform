import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { type, amount, currency, category, description, date } = body as Record<string, unknown>;

  const existing = await db.financeRecord.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "記錄不存在" }, { status: 404 });

  if (type !== undefined && type !== "INCOME" && type !== "EXPENSE") {
    return NextResponse.json({ error: "type 必須為 INCOME 或 EXPENSE" }, { status: 400 });
  }

  const record = await db.financeRecord.update({
    where: { id },
    data: {
      ...(type ? { type: type as "INCOME" | "EXPENSE" } : {}),
      ...(amount !== undefined ? { amount: Number(amount) } : {}),
      ...(currency !== undefined ? { currency: currency as string } : {}),
      ...(category !== undefined ? { category: (category as string).trim() } : {}),
      ...(description !== undefined ? { description: (description as string).trim() || null } : {}),
      ...(date !== undefined ? { date: new Date(date as string) } : {}),
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json(record);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const guard = await requireAuthJson(3, request);
  if (guard.error) return guard.error;

  const { id } = await params;

  const existing = await db.financeRecord.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "記錄不存在" }, { status: 404 });

  await db.financeRecord.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
