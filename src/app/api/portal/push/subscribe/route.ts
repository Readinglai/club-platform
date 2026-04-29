import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function POST(request: NextRequest) {
  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  const { endpoint, keys } = await request.json();

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "endpoint, keys.p256dh and keys.auth are required" }, { status: 400 });
  }

  const sub = await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: guard.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: {
      userId: guard.userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return NextResponse.json({ id: sub.id }, { status: 201 });
}
