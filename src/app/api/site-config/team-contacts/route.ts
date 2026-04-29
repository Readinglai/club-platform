/**
 * /api/site-config/team-contacts
 *
 * GET — 公開端點，回傳執委聯絡資訊陣列。
 * 若 SiteConfig 中無記錄，回傳內建 fallback。
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface TeamContact {
  title: string;
  name: string;
  email: string;
}

const FALLBACK: TeamContact[] = [
  { title: "President",        name: "David Chen", email: "david.chen@mail.utoronto.ca" },
  { title: "VP of Events",     name: "Sarah Lin",  email: "sarah.lin@mail.utoronto.ca" },
  { title: "VP of Marketing",  name: "Kevin Wu",   email: "kevin.wu@mail.utoronto.ca" },
  { title: "VP of Operations", name: "Amy Huang",  email: "amy.huang@mail.utoronto.ca" },
];

export async function GET() {
  try {
    const record = await db.siteConfig.findUnique({ where: { key: "teamContacts" } });
    if (record?.value) {
      const data = JSON.parse(record.value) as TeamContact[];
      if (Array.isArray(data) && data.length > 0) return NextResponse.json(data);
    }
  } catch { /* DB unavailable — return fallback */ }
  return NextResponse.json(FALLBACK);
}
