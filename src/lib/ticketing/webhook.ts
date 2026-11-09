/**
 * Stripe webhook handling for Order checkouts (see orders.ts).
 * Returns false for anything that is not an Order checkout, so the caller
 * can fall through to the membership and Halloween flows unchanged.
 */

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendOrderTicketEmail } from "@/lib/email";
import { expireOrder, markOrderPaid, ORDER_CHECKOUT_KIND, refundOrder } from "./orders";
import { formatEventTime, formatPrice } from "./format";
import { siteOrigin } from "./request";

export async function handleOrderCheckoutEvent(event: Stripe.Event): Promise<boolean> {
  if (event.type === "charge.refunded") {
    return handleRefund(event.data.object);
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed"
  ) {
    return false;
  }

  const session = event.data.object;
  const orderId = session.metadata?.orderId;
  if (session.metadata?.kind !== ORDER_CHECKOUT_KIND || !orderId) {
    return false;
  }

  // Checkout closed unpaid, or a delayed payment (e.g. bank debit) bounced.
  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    await expireOrder(orderId);
    return true;
  }

  // "completed" with payment_status "unpaid" means a delayed payment method:
  // the tickets stay held until async_payment_succeeded arrives.
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

/**
 * Refunds made in the Stripe dashboard. The order is found through the
 * payment's metadata (set on orders created from Hilo Party onwards).
 * Needs "charge.refunded" switched on for the webhook endpoint in Stripe.
 */
async function handleRefund(charge: Stripe.Charge): Promise<boolean> {
  let metadata: Stripe.Metadata | null = charge.metadata;
  // Older orders only carry metadata on their Checkout session.
  if (!metadata?.orderId && typeof charge.payment_intent === "string") {
    const sessions = await stripe.checkout.sessions.list({ payment_intent: charge.payment_intent, limit: 1 });
    metadata = sessions.data[0]?.metadata ?? null;
  }
  const orderId = metadata?.orderId;
  if (metadata?.kind !== ORDER_CHECKOUT_KIND || !orderId) {
    return false;
  }
  const full = charge.refunded || charge.amount_refunded >= charge.amount;
  const result = await refundOrder(orderId, full);
  console.log(`Refund for order ${orderId}: ${full ? "full" : "partial"}${result.refunded ? ", tickets voided" : ""}`);
  return true;
}

/** Ticket emails are best-effort: a failure is logged, the ticket stays valid. */
export async function sendConfirmation(orderId: string) {
  const origin = siteOrigin();

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      event: { include: { settings: true } },
      tickets: { where: { status: "VALID" }, include: { ticketType: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!order || order.tickets.length === 0) return;

  // Test buyers use the reserved .invalid domain; never try to mail them.
  if (order.buyerEmail.endsWith(".invalid")) return;

  const timezone = order.event.settings?.timezone ?? "America/Toronto";

  try {
    await sendOrderTicketEmail({
      to: order.buyerEmail,
      name: order.buyerName,
      eventTitle: order.event.title,
      when: formatEventTime(order.event.startAt, order.event.endAt, timezone),
      location: order.event.location,
      tickets: order.tickets.map((ticket) => ({
        ticketType: ticket.ticketType.name,
        price: formatPrice(ticket.pricePaid, order.currency),
        ticketUrl: `${origin}/ticket/${ticket.token}`,
      })),
    });
  } catch (error) {
    console.error(`Failed to send ticket email for order ${orderId}:`, error);
  }
}
