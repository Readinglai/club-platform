/**
 * Stripe webhook handling for Order checkouts (see orders.ts).
 * Returns false for anything that is not an Order checkout, so the caller
 * can fall through to the Halloween flow unchanged.
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { sendOrderTicketEmail } from "@/lib/email";
import { expireOrder, markOrderPaid, ORDER_CHECKOUT_KIND } from "./orders";
import { formatEventTime, formatPrice } from "./format";

export async function handleOrderCheckoutEvent(event: Stripe.Event): Promise<boolean> {
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return false;
  }

  const session = event.data.object;
  const orderId = session.metadata?.orderId;
  if (session.metadata?.kind !== ORDER_CHECKOUT_KIND || !orderId) {
    return false;
  }

  if (event.type === "checkout.session.expired") {
    await expireOrder(orderId);
    return true;
  }

  if (session.payment_status !== "paid") {
    return true;
  }

  const result = await markOrderPaid(orderId, session.id);
  if (!result.updated) {
    if (result.reason !== "already_paid") {
      console.error(`Paid checkout ${session.id} could not be applied to order ${orderId}: ${result.reason}`);
    }
    return true;
  }

  await sendConfirmation(orderId);
  return true;
}

/** Ticket emails are best-effort: a failure is logged, the ticket stays valid. */
export async function sendConfirmation(orderId: string) {
  const origin = process.env.NEXTAUTH_URL;
  if (!origin) {
    console.error("NEXTAUTH_URL is not configured; ticket email not sent for order", orderId);
    return;
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: { include: { settings: true } },
      tickets: { where: { status: "VALID" }, include: { ticketType: true } },
    },
  });
  if (!order) return;

  // Test buyers use the reserved .invalid domain; never try to mail them.
  if (order.buyerEmail.endsWith(".invalid")) return;

  const timezone = order.event.settings?.timezone ?? "America/Toronto";

  for (const ticket of order.tickets) {
    try {
      await sendOrderTicketEmail({
        to: order.buyerEmail,
        name: ticket.holderName,
        eventTitle: order.event.title,
        ticketType: ticket.ticketType.name,
        price: formatPrice(ticket.pricePaid, order.currency),
        when: formatEventTime(order.event.startAt, order.event.endAt, timezone),
        location: order.event.location,
        ticketUrl: `${origin}/ticket/${ticket.token}`,
      });
    } catch (error) {
      console.error(`Failed to send ticket email for order ${orderId}:`, error);
    }
  }
}
