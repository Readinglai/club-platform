/**
 * POST /api/hilo/orders — buy Hilo Party tickets as a guest. Same as
 * /api/events/[id]/orders, but always for the Hilo event and phone is required.
 */

import { NextResponse } from "next/server";
import { hiloEventId } from "@/lib/hilo";
import { handleOrderRequest } from "@/lib/ticketing/order-request";

export async function POST(request: Request) {
  const eventId = hiloEventId();
  if (!eventId) {
    return NextResponse.json({ code: "tickets_unavailable", message: "Tickets are not available." }, { status: 404 });
  }
  return handleOrderRequest(request, eventId, { requirePhone: true });
}
