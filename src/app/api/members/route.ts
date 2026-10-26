/**
 * GET /api/members — the club's public team: people holding a position, by
 * department (src/lib/team/public.ts). Paying members are never listed.
 */

import { NextResponse } from "next/server";
import { getPublicTeam } from "@/lib/team/public";

export async function GET() {
  return NextResponse.json({ departments: await getPublicTeam() });
}
