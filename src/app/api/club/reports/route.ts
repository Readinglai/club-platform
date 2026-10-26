/**
 * GET /api/club/reports?type=events|memberships&year=&format=csv
 * Club totals for the Reports page (any VP, the President).
 */

import { NextRequest, NextResponse } from "next/server";
import { requirePermissionJson } from "@/lib/access/require";
import { termFor } from "@/lib/membership/term";
import { attendanceCsv, eventAttendance, membershipsByMonth, membershipsCsv } from "@/lib/reports/summary";

export async function GET(request: NextRequest) {
  const guard = await requirePermissionJson("reports.view");
  if (guard.error) return guard.error;

  const p = request.nextUrl.searchParams;
  const type = p.get("type") === "memberships" ? "memberships" : "events";
  const year = Number(p.get("year"));
  const startYear = Number.isInteger(year) && year > 2000 ? year : termFor().startYear;
  const csv = p.get("format") === "csv";

  if (type === "events") {
    const rows = await eventAttendance();
    if (!csv) return NextResponse.json({ events: rows }, { headers: { "Cache-Control": "no-store" } });
    return csvResponse(attendanceCsv(rows), "event-attendance.csv");
  }
  const report = await membershipsByMonth(startYear);
  if (!csv) return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  return csvResponse(membershipsCsv(report.months), `memberships-${startYear}-${String(startYear + 1).slice(2)}.csv`);
}

function csvResponse(body: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
