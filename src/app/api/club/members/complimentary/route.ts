/** POST /api/club/members/complimentary { apply } — list (apply false) or grant free memberships to staff. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { grantComplimentaryToStaff } from "@/lib/membership/admin";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const result = await grantComplimentaryToStaff(user.id, body.apply === true);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  return NextResponse.json({ people: result.people });
}
