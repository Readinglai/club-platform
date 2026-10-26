/** GET /api/team — groups the signed-in person may manage, with members. */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getAccess } from "@/lib/access/can";
import { isPresident, listManageableGroups } from "@/lib/access/team";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await listManageableGroups(await getAccess(user.id));
  return NextResponse.json(
    { groups, canAppointVps: await isPresident(user.id) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
