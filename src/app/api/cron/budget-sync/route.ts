/**
 * GET /api/cron/budget-sync — daily (vercel.json): re-read the Google Sheet
 * budget of every event from 60 days ago to a year ahead.
 * Called by Vercel Cron with Authorization: Bearer ${CRON_SECRET}.
 */

import { NextResponse } from "next/server";
import { syncActiveBudgetSheets } from "@/lib/finance/sheet-sync";
import { sheetSyncEnabled } from "@/lib/finance/google-sheets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sheetSyncEnabled()) return NextResponse.json({ skipped: "Sheet syncing isn't set up." });
  return NextResponse.json(await syncActiveBudgetSheets());
}
