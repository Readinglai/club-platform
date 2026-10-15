/**
 * Ticket orders for every event after Halloween 2026 (Order / Ticket tables).
 * Halloween keeps its own flow in /api/event/checkout and the legacy tables.
 *
 * Flow:
 *   createOrder  → free tier: order FREE, ticket VALID immediately
 *                → paid tier: order PENDING + ticket RESERVED, then Stripe Checkout
 *   markOrderPaid (webhook checkout.session.completed) → PAID / VALID
 *   expireOrder   (webhook checkout.session.expired)   → EXPIRED / VOID
 *
 * Member pricing and members-only tiers need the Membership table (Phase 1);
 * until then memberPrice is ignored and members-only tiers cannot be bought.
 */

import crypto from "crypto";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Prisma } from "@/generated/prisma/client";

/** How long a paid checkout holds its ticket before Stripe expires it. */
export const CHECKOUT_HOLD_MINUTES = 30;

/** Stripe metadata marker that routes a checkout to this flow in the webhook. */
export const ORDER_CHECKOUT_KIND = "order";

export type BuyerInput = {
  name: string;
  email: string;
  phone?: string;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; free: true; ticketToken: string }
  | { ok: true; orderId: string; free: false; checkoutUrl: string }
  | { ok: false; status: number; message: string };

function fail(status: number, message: string): CreateOrderResult {
  return { ok: false, status, message };
}

export async function createOrder(input: {
  eventId: string;
  ticketTypeId: string;
  quantity?: number;
  buyer: BuyerInput;
  userId?: string | null;
  waiverAccepted: boolean;
  origin: string;
}): Promise<CreateOrderResult> {
  const quantity = input.quantity ?? 1;
  const buyer = {
    name: input.buyer.name.trim().replace(/\s+/g, " "),
    email: input.buyer.email.trim().toLowerCase(),
    phone: input.buyer.phone?.trim() || null,
  };

  if (!buyer.name || !buyer.email) {
    return fail(400, "Please enter your name and email.");
  }
  if (!input.waiverAccepted) {
    return fail(400, "You must agree to the waiver.");
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail(400, "Invalid quantity.");
  }

  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, title: true, settings: true },
  });
  // ticketsEnabled is the on-switch for sales, independent of whether the
  // event is listed publicly (test events stay unpublished).
  if (!event || !event.settings?.ticketsEnabled) {
    return fail(404, "Tickets are not available for this event.");
  }

  const ticketType = await db.ticketType.findFirst({
    where: { id: input.ticketTypeId, eventId: event.id, active: true },
  });
  if (!ticketType) {
    return fail(400, "This ticket type is not available.");
  }
  if (ticketType.membersOnly) {
    return fail(400, "This ticket type is for members only.");
  }
  if (quantity > ticketType.maxPerOrder) {
    return fail(400, `You can buy up to ${ticketType.maxPerOrder} ticket(s) per order.`);
  }

  const now = new Date();
  if (ticketType.salesStartAt && now < ticketType.salesStartAt) {
    return fail(400, "Ticket sales have not started yet.");
  }
  if (ticketType.salesEndAt && now > ticketType.salesEndAt) {
    return fail(400, "Ticket sales have ended.");
  }

  const unitPrice = ticketType.price;
  const total = unitPrice.mul(quantity);
  const free = total.isZero();
  const currency = event.settings.currency;

  // Create the order and its tickets under a per-tier lock so two buyers
  // cannot both take the last seat.
  const created = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ticketType.id}))`;

    if (ticketType.capacity !== null) {
      const holdCutoff = new Date(now.getTime() - CHECKOUT_HOLD_MINUTES * 60_000);
      const taken = await tx.ticket.count({
        where: {
          ticketTypeId: ticketType.id,
          OR: [
            { status: "VALID" },
            { status: "RESERVED", order: { status: "PENDING", createdAt: { gt: holdCutoff } } },
          ],
        },
      });
      if (taken + quantity > ticketType.capacity) {
        return null;
      }
    }

    return tx.order.create({
      data: {
        eventId: event.id,
        userId: input.userId ?? null,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        status: free ? "FREE" : "PENDING",
        totalAmount: total,
        currency,
        waiverAcceptedAt: now,
        waiverVersion: "v1",
        tickets: {
          create: Array.from({ length: quantity }, () => ({
            eventId: event.id,
            ticketTypeId: ticketType.id,
            userId: input.userId ?? null,
            holderName: buyer.name,
            holderEmail: buyer.email,
            token: crypto.randomUUID(),
            status: free ? ("VALID" as const) : ("RESERVED" as const),
            pricePaid: unitPrice,
          })),
        },
      },
      include: { tickets: { select: { token: true } } },
    });
  });

  if (!created) {
    return fail(409, "This ticket type is sold out.");
  }

  if (free) {
    return { ok: true, orderId: created.id, free: true, ticketToken: created.tickets[0].token };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_HOLD_MINUTES * 60,
      customer_email: buyer.email,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { name: `${event.title} — ${ticketType.name}` },
            unit_amount: toMinorUnits(unitPrice),
          },
          quantity,
        },
      ],
      metadata: { kind: ORDER_CHECKOUT_KIND, orderId: created.id, eventId: event.id },
      // The session id in the return URL proves to /order/[id] that the visitor
      // is the buyer, so the ticket links are only shown to them.
      success_url: `${input.origin}/order/${created.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/order/${created.id}?session_id={CHECKOUT_SESSION_ID}&cancelled=1`,
    });

    await db.order.update({
      where: { id: created.id },
      data: { stripeSessionId: session.id },
    });

    return { ok: true, orderId: created.id, free: false, checkoutUrl: session.url! };
  } catch (error) {
    console.error("Stripe checkout creation failed for order", created.id, error);
    await releaseOrder(created.id, "CANCELLED");
    return fail(502, "Payment could not be started. Please try again.");
  }
}

/** Stripe confirmed payment: activate the order's tickets. Safe to call twice. */
export async function markOrderPaid(orderId: string, stripeSessionId: string) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`;

    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) return { updated: false as const, reason: "not_found" as const };
    if (order.stripeSessionId && order.stripeSessionId !== stripeSessionId) {
      return { updated: false as const, reason: "session_mismatch" as const };
    }
    if (order.status === "PAID") return { updated: false as const, reason: "already_paid" as const };

    // A late payment for an expired hold still gets its ticket: the buyer paid.
    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: new Date(), stripeSessionId },
    });
    await tx.ticket.updateMany({
      where: { orderId, status: { in: ["RESERVED", "VOID"] } },
      data: { status: "VALID" },
    });
    return { updated: true as const, reason: "paid" as const };
  });
}

/** Stripe checkout expired without payment: release the held tickets. */
export async function expireOrder(orderId: string) {
  return releaseOrder(orderId, "EXPIRED");
}

async function releaseOrder(orderId: string, status: "EXPIRED" | "CANCELLED") {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`;

    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status },
    });
    if (count > 0) {
      await tx.ticket.updateMany({
        where: { orderId, status: "RESERVED" },
        data: { status: "VOID" },
      });
    }
    return { released: count > 0 };
  });
}

/** Stripe wants integer minor units (cents). */
function toMinorUnits(amount: Prisma.Decimal): number {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}
