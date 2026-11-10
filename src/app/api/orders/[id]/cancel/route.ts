/**
 * POST /api/orders/[id]/cancel?session_id=cs_... — the buyer came back from
 * Stripe Checkout with its "back" link. Closes that checkout and frees the
 * order's seats and member discount straight away (see cancelUnpaidOrder).
 */

import { NextRequest, NextResponse } from "next/server";
import { cancelUnpaidOrder } from "@/lib/ticketing/orders";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ cancelled: false }, { status: 400 });
  try {
    const cancelled = await cancelUnpaidOrder(id, sessionId);
    return NextResponse.json({ cancelled }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // The hold still runs out by itself after about 30 minutes.
    console.error(`Could not cancel order ${id}:`, error);
    return NextResponse.json({ cancelled: false }, { status: 500 });
  }
}
