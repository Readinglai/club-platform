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
  const { subject, body } = await request.json();

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }

  const template = await db.emailTemplate.upsert({
    where: { key },
    create: { key, subject: subject.trim(), body: body.trim() },
    update: { subject: subject.trim(), body: body.trim() },
  });

  return NextResponse.json(template);
}
