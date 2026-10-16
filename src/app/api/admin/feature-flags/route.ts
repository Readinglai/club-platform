import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermissionJson } from "@/lib/access/require";

export async function GET() {
  const guard = await requirePermissionJson("content.manage");
  if (guard.error) return guard.error;

  const flags = await db.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(flags);
}
