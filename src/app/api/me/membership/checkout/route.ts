/** POST /api/me/membership/checkout — start paying for a membership; returns { checkoutUrl }. */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { startMembershipCheckout } from "@/lib/membership/purchase";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin =
    request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

  const result = await startMembershipCheckout({
    userId: user.id,
    email: user.email,
    name: user.name,
    origin,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return NextResponse.json({ checkoutUrl: result.checkoutUrl });
}
