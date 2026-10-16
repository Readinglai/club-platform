/** GET /api/work/tasks — my tasks, and the departments/groups I work in. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { myTaskGroups } from "@/lib/tasks/access";
import { getMyTasks } from "@/lib/tasks/tasks";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [tasks, groups] = await Promise.all([getMyTasks(user.id), myTaskGroups(user.id)]);
  return NextResponse.json({ tasks, groups }, { headers: { "Cache-Control": "no-store" } });
}
