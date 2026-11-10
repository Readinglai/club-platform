/**
 * GET /api/orders/[id]?session_id=cs_...&lang=zh — order status after Stripe checkout.
 *
 * Ticket links are only returned when session_id matches the order's Stripe
 * session (it arrives in Stripe's return URL), so knowing an order id alone
 * does not reveal anyone's tickets.
 *
 * While the order still looks unpaid, Stripe is asked directly, so a buyer
 * who paid gets their ticket even if the webhook is late or misconfigured.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmFromStripe } from "@/lib/ticketing/webhook";
import { eventPagePath } from "@/lib/hilo";

const readOrder = (id: string) =>
  db.order.findUnique({
    where: { id },
    select: {
      status: true,
      stripeSessionId: true,
      eventId: true,
      event: { select: { title: true } },
      tickets: { select: { token: true, status: true, ticketType: { select: { name: true } } } },
    },
  });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const lang = request.nextUrl.searchParams.get("lang") === "zh" ? "zh" : "en";

  let order = await readOrder(id);
  if (!order || !sessionId || order.stripeSessionId !== sessionId) {
    return NextResponse.json({ message: "Order not found." }, { status: 404 });
  }

  if (order.status === "PENDING") {
    try {
      await confirmFromStripe(id, sessionId);
      order = (await readOrder(id)) ?? order;
    } catch (error) {
      // Stripe unreachable: keep waiting for the webhook as before.
      console.error(`Could not check Stripe for order ${id}:`, error);
    }
  }

  const paid = order.status === "PAID";

  return NextResponse.json(
    {
      status: order.status,
      eventTitle: order.event.title,
      eventPath: eventPagePath(order.eventId, lang),
      tickets: paid
        ? order.tickets
            .filter((t) => t.status === "VALID")
            .map((t) => ({ token: t.token, ticketType: t.ticketType.name }))
        : [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
