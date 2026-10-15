/**
 * GET /api/orders/[id]?session_id=cs_... — order status after Stripe checkout.
 *
 * Ticket links are only returned when session_id matches the order's Stripe
 * session (it arrives in Stripe's return URL), so knowing an order id alone
 * does not reveal anyone's tickets.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sessionId = request.nextUrl.searchParams.get("session_id");

  const order = await db.order.findUnique({
    where: { id },
    select: {
      status: true,
      stripeSessionId: true,
      event: { select: { title: true } },
      tickets: { select: { token: true, status: true, ticketType: { select: { name: true } } } },
    },
  });

  if (!order || !sessionId || order.stripeSessionId !== sessionId) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }

  const paid = order.status === "PAID";

  return NextResponse.json(
    {
      status: order.status,
      eventTitle: order.event.title,
      tickets: paid
        ? order.tickets
            .filter((t) => t.status === "VALID")
            .map((t) => ({ token: t.token, ticketType: t.ticketType.name }))
        : [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
