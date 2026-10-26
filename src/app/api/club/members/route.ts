/**
 * GET  /api/club/members?q=&status=&source=&year=&format=csv — this year's members.
 * POST /api/club/members { name, email } — add one member by hand.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { forbidUnless } from "@/lib/access/require";
import { addMember, listMemberships, membersCsv, type MemberFilters } from "@/lib/membership/admin";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const forbidden = await forbidUnless(user.id, "members.view");
  if (forbidden) return forbidden;

  const p = request.nextUrl.searchParams;
  const year = Number(p.get("year"));
  const list = await listMemberships({
    q: p.get("q") ?? undefined,
    status: (p.get("status") as MemberFilters["status"]) || undefined,
    source: (p.get("source") as MemberFilters["source"]) || undefined,
    year: Number.isInteger(year) && year > 2000 ? year : undefined,
  });

  if (p.get("format") === "csv") {
    return new NextResponse(membersCsv(list.rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="members-${list.schoolYear.replace("–", "-")}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await addMember(user.id, body);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ memberCode: result.value });
}
