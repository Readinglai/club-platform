/** GET /api/work/staff?q= — staff search for assigning tasks (staff only). */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { isStaff } from "@/lib/tasks/access";
import { searchStaff } from "@/lib/tasks/tasks";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isStaff(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ people: await searchStaff(request.nextUrl.searchParams.get("q") ?? "") });
}
