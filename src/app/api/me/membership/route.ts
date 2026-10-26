/**
 * GET /api/me/membership — the signed-in person's membership status.
 * { status: "ACTIVE" | "PENDING" | "NONE", memberCode?, validUntil?, priceCad }
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access/current-user";
import { getCurrentMembership } from "@/lib/membership/purchase";
import { MEMBERSHIP_PRICE_CAD } from "@/lib/membership/config";
import { walletPassUrl } from "@/lib/membership/wallet-pass";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await getCurrentMembership(user.id);
  const pending = active
    ? null
    : await db.membership.findFirst({
        where: { userId: user.id, status: "PENDING", source: "STRIPE" },
        select: { id: true },
      });

  return NextResponse.json(
    {
      status: active ? "ACTIVE" : pending ? "PENDING" : "NONE",
      memberCode: active?.memberCode,
      validUntil: active?.termEnd.toISOString(),
      walletUrl: active?.walletPassId ? walletPassUrl(active.walletPassId) : null,
      priceCad: MEMBERSHIP_PRICE_CAD,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
