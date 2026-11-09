/**
 * POST /api/hilo/member-check — { code, cardName } → does this member get the
 * discount at Hilo Party? Only for showing the price; the order checks again.
 * Every kind of mismatch gets the same answer, and wrong guesses are limited.
 */

import { NextResponse } from "next/server";
import { hiloEventId } from "@/lib/hilo";
import { checkMemberDiscount } from "@/lib/ticketing/member-discount";
import { clientIp, recordMemberFailure, tooManyMemberFailures } from "@/lib/ticketing/request";

export async function POST(request: Request) {
  const eventId = hiloEventId();
  if (!eventId) return NextResponse.json({ ok: false, code: "member_discount_unavailable" }, { status: 404 });

  const ip = clientIp(request.headers);
  if (tooManyMemberFailures(ip)) {
    return NextResponse.json({ ok: false, code: "member_rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code : "";
  const cardName = typeof body.cardName === "string" ? body.cardName : "";

  const result = await checkMemberDiscount(eventId, code, cardName);
  if (!result.ok && result.code === "member_not_found") recordMemberFailure(ip);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
