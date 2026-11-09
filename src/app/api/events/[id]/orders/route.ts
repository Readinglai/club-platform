/**
 * POST /api/events/[id]/orders — buy (or claim a free) ticket for an event.
 * See src/lib/ticketing/order-request.ts for the body and replies.
 */

import { NextRequest } from "next/server";
import { handleOrderRequest } from "@/lib/ticketing/order-request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  return handleOrderRequest(request, eventId);
}
