import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/guard";

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(4, request);
  if (guard.error) return guard.error;

  const templates = await db.emailTemplate.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(templates);
}
