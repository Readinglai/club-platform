import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionJson } from "@/lib/access/require";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const guard = await requirePermissionJson("content.manage");
  if (guard.error) return guard.error;

  const { key } = await params;
  const body = await request.json();

  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be boolean" }, { status: 400 });
  }

  const flag = await db.featureFlag.upsert({
    where: { key },
    create: { key, enabled: body.enabled },
    update: { enabled: body.enabled },
  });

  return NextResponse.json(flag);
}
