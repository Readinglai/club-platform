import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function DELETE(request: NextRequest) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { endpoint } = await request.json();

  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await db.pushSubscription.deleteMany({
    where: { endpoint, userId: guard.userId },
  });

  return new NextResponse(null, { status: 204 });
}
