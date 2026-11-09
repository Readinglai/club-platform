/**
 * Ticket orders for every event after Halloween 2026 (Order / Ticket tables).
 * Halloween keeps its own flow in /api/event/checkout and the legacy tables.
 *
 * Flow:
 *   createOrder  → free order: FREE, tickets VALID immediately
 *                → paid order: PENDING + tickets RESERVED until Order.expiresAt, then Stripe Checkout
 *   markOrderPaid (webhook checkout.session.completed) → PAID / VALID
 *   expireOrder   (webhook checkout.session.expired)   → EXPIRED / VOID
 *   refundOrder   (webhook charge.refunded, full)      → REFUNDED / VOID
 *
 * Two kinds of member pricing:
 * - Logged-in (older events): a signed-in buyer with an active membership pays
 *   the tier's memberPrice, once per event.
 * - Guest member discount (Hilo Party onwards): EventSettings.memberDiscountAmount
 *   off ONE ticket, after the buyer gives their member code + card name. Once per
 *   member per event, tracked by an EventMemberRedemption row:
 *     PENDING  while the order waits for payment
 *     USED     once it is paid (or free)
 *     RELEASED when the checkout expires / is cancelled — only then can another
 *              order take it. Release happens only on Stripe's own "expired"
 *              signal, and an expired Stripe session can't be paid, so a
 *              released discount is never also paid for.
 */

import crypto from "crypto";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentMembership } from "@/lib/membership/purchase";
import { isValidEmail, isValidPhone } from "@/lib/event/contact-validation";
import { findMembershipForDiscount } from "./member-discount";

/** How long a paid checkout holds its tickets (orders made before Order.expiresAt existed). */
export const CHECKOUT_HOLD_MINUTES = 30;

/**
 * New orders: the hold and the Stripe session expire at the same moment.
 * Stripe needs expires_at at least 30 minutes away when the session is
 * created; the extra two minutes cover the time it takes to get there.
 */
const HOLD_MS = 32 * 60_000;

/** Stripe metadata marker that routes a checkout to this flow in the webhook. */
export const ORDER_CHECKOUT_KIND = "order";

export type BuyerInput = {
  name: string;
  email: string;
  phone?: string;
};

export type MemberInput = {
  code: string;
  cardName: string;
};

/**
 * Why an order was refused. Pages show their own translated text for each
 * code; `message` is the English fallback for other callers.
 */
export type OrderErrorCode =
  | "missing_details"
  | "invalid_email"
  | "invalid_phone"
  | "waiver_required"
  | "invalid_quantity"
  | "tickets_unavailable"
  | "type_unavailable"
  | "max_per_order"
  | "not_started"
  | "ended"
  | "members_only"
  | "member_limit"
  | "member_not_found"
  | "member_discount_used"
  | "member_discount_pending"
  | "member_discount_unavailable"
  | "sold_out"
  | "payment_failed";

export type CreateOrderResult =
  | { ok: true; orderId: string; free: true; ticketToken: string }
  | { ok: true; orderId: string; free: false; checkoutUrl: string }
  | { ok: false; status: number; code: OrderErrorCode; message: string; max?: number };

function fail(status: number, code: OrderErrorCode, message: string, extra?: { max?: number }): CreateOrderResult {
  return { ok: false, status, code, message, ...extra };
}

/**
 * Tickets that use up a tier's capacity: valid ones, and reserved ones whose
 * order is still inside its hold. Shared by sales, the public page and the dashboard.
 */
export function activeTicketWhere(now: Date): Prisma.TicketWhereInput {
  const legacyCutoff = new Date(now.getTime() - CHECKOUT_HOLD_MINUTES * 60_000);
  return {
    OR: [
      { status: "VALID" },
      {
        status: "RESERVED",
        order: {
          status: "PENDING",
          OR: [{ expiresAt: { gt: now } }, { expiresAt: null, createdAt: { gt: legacyCutoff } }],
        },
      },
    ],
  };
}

type Refusal = "member_limit" | "member_discount_used" | "member_discount_pending" | "sold_out";

export async function createOrder(input: {
  eventId: string;
  ticketTypeId: string;
  quantity?: number;
  buyer: BuyerInput;
  userId?: string | null;
  waiverAccepted: boolean;
  /** Site address for Stripe's return links, e.g. https://rocsaut.ca */
  origin: string;
  /** Guest member discount details, when the buyer gave them. */
  member?: MemberInput | null;
  requirePhone?: boolean;
}): Promise<CreateOrderResult> {
  const quantity = input.quantity ?? 1;
  const buyer = {
    name: input.buyer.name.trim().replace(/\s+/g, " "),
    email: input.buyer.email.trim().toLowerCase(),
    phone: input.buyer.phone?.trim() || null,
  };

  if (!buyer.name || !buyer.email || (input.requirePhone && !buyer.phone)) {
    return fail(400, "missing_details", input.requirePhone ? "Please enter your name, email and phone." : "Please enter your name and email.");
  }
  if (!isValidEmail(buyer.email)) {
    return fail(400, "invalid_email", "Please enter a valid email address.");
  }
  if (buyer.phone && !isValidPhone(buyer.phone)) {
    return fail(400, "invalid_phone", "Please enter a valid phone number.");
  }
  if (!input.waiverAccepted) {
    return fail(400, "waiver_required", "You must agree to the waiver.");
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return fail(400, "invalid_quantity", "Invalid quantity.");
  }

  const event = await db.event.findUnique({
    where: { id: input.eventId },
    select: { id: true, title: true, settings: true },
  });
  // ticketsEnabled is the on-switch for sales, independent of whether the
  // event is listed publicly (test events stay unpublished).
  if (!event || !event.settings?.ticketsEnabled) {
    return fail(404, "tickets_unavailable", "Tickets are not available for this event.");
  }

  const ticketType = await db.ticketType.findFirst({
    where: { id: input.ticketTypeId, eventId: event.id, active: true },
  });
  if (!ticketType) {
    return fail(400, "type_unavailable", "This ticket type is not available.");
  }
  if (quantity > ticketType.maxPerOrder) {
    return fail(400, "max_per_order", `You can buy up to ${ticketType.maxPerOrder} ticket(s) per order.`, { max: ticketType.maxPerOrder });
  }

  const now = new Date();
  if (ticketType.salesStartAt && now < ticketType.salesStartAt) {
    return fail(400, "not_started", "Ticket sales have not started yet.");
  }
  if (ticketType.salesEndAt && now > ticketType.salesEndAt) {
    return fail(400, "ended", "Ticket sales have ended.");
  }

  // Guest member discount: check the details before taking any locks.
  const discountAmount = event.settings.memberDiscountAmount;
  let discountMembershipId: string | null = null;
  if (input.member) {
    if (!discountAmount || discountAmount.lte(0)) {
      return fail(400, "member_discount_unavailable", "This event has no member discount.");
    }
    const membership = await findMembershipForDiscount(input.member.code, input.member.cardName, now);
    if (!membership) {
      return fail(400, "member_not_found", "That member ID and name don't match an active membership.");
    }
    discountMembershipId = membership.id;
  }

  // Logged-in member pricing (older events) only when no guest discount is used.
  const isMember = !discountMembershipId && input.userId ? Boolean(await getCurrentMembership(input.userId)) : false;
  if (ticketType.membersOnly && !isMember) {
    return fail(403, "members_only", "This ticket type is for members only. Log in with your member account.");
  }
  const currency = event.settings.currency;

  // Create the order and its tickets under a per-tier lock so two buyers
  // cannot both take the last seat.
  const created = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${ticketType.id}))`;

    // Older logged-in member price: once per member per event (serialised per member + event).
    let loggedInMemberPricing = false;
    if (isMember && input.userId) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`member-price-${event.id}-${input.userId}`}))`;
      const used = await tx.ticket.count({
        where: { eventId: event.id, userId: input.userId, memberPricing: true, ...activeTicketWhere(now) },
      });
      if (used > 0 && ticketType.membersOnly) return "member_limit" satisfies Refusal;
      loggedInMemberPricing = used === 0 && (ticketType.membersOnly || ticketType.memberPrice !== null);
    }

    // Guest member discount: one per membership + event, serialised per
    // membership + event so two simultaneous checkouts can't both get it.
    let redemption: { id: string } | null = null;
    if (discountMembershipId) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`member-discount:${discountMembershipId}:${event.id}`}))`;
      const existing = await tx.eventMemberRedemption.findUnique({
        where: { membershipId_eventId: { membershipId: discountMembershipId, eventId: event.id } },
        include: { order: { select: { status: true } } },
      });
      if (existing) {
        const holder = existing.order?.status;
        if (existing.status === "USED" || holder === "PAID" || holder === "FREE") {
          return "member_discount_used" satisfies Refusal;
        }
        // Still waiting for its payment (or for Stripe to say it expired).
        if (existing.status === "PENDING" && holder === "PENDING") {
          return "member_discount_pending" satisfies Refusal;
        }
        // RELEASED, or PENDING whose order already ended: free to take over.
        redemption = { id: existing.id };
      }
    }

    // Price of each ticket in the order.
    const fullPrice = ticketType.price;
    const prices: { price: Prisma.Decimal; memberPricing: boolean }[] = Array.from({ length: quantity }, () => ({
      price: fullPrice,
      memberPricing: false,
    }));
    if (discountMembershipId && discountAmount) {
      const off = Prisma.Decimal.min(discountAmount, fullPrice);
      prices[0] = { price: fullPrice.sub(off), memberPricing: true };
    } else if (loggedInMemberPricing) {
      const memberUnit = ticketType.memberPrice ?? fullPrice;
      prices.fill({ price: memberUnit, memberPricing: true });
    }
    const total = prices.reduce((sum, p) => sum.add(p.price), new Prisma.Decimal(0));
    const free = total.isZero();

    if (ticketType.capacity !== null) {
      const taken = await tx.ticket.count({
        where: { ticketTypeId: ticketType.id, ...activeTicketWhere(now) },
      });
      if (taken + quantity > ticketType.capacity) {
        return "sold_out" satisfies Refusal;
      }
    }

    const expiresAt = free ? null : new Date(now.getTime() + HOLD_MS);
    const order = await tx.order.create({
      data: {
        eventId: event.id,
        userId: input.userId ?? null,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        status: free ? "FREE" : "PENDING",
        totalAmount: total,
        currency,
        expiresAt,
        waiverAcceptedAt: now,
        waiverVersion: "v1",
        tickets: {
          create: prices.map((p) => ({
            eventId: event.id,
            ticketTypeId: ticketType.id,
            userId: input.userId ?? null,
            holderName: buyer.name,
            holderEmail: buyer.email,
            token: crypto.randomUUID(),
            status: free ? ("VALID" as const) : ("RESERVED" as const),
            pricePaid: p.price,
            memberPricing: p.memberPricing,
          })),
        },
      },
      include: { tickets: { select: { token: true } } },
    });

    if (discountMembershipId) {
      const data = {
        orderId: order.id,
        status: free ? ("USED" as const) : ("PENDING" as const),
        usedAt: free ? now : null,
      };
      if (redemption) {
        await tx.eventMemberRedemption.update({ where: { id: redemption.id }, data });
      } else {
        // The lock above means no one else can insert this row now; the
        // unique (membershipId, eventId) index is the last line of defence.
        await tx.eventMemberRedemption.create({ data: { ...data, membershipId: discountMembershipId, eventId: event.id } });
      }
    }

    return { order, prices, free, expiresAt };
  }).catch((error: unknown): Refusal => {
    // A unique-index clash on the redemption means another order got it first.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "member_discount_pending" satisfies Refusal;
    }
    throw error;
  });

  if (created === "member_limit") {
    return fail(409, "member_limit", "You've already used your member ticket for this event.");
  }
  if (created === "member_discount_used") {
    return fail(409, "member_discount_used", "This membership has already used its member discount for this event.");
  }
  if (created === "member_discount_pending") {
    return fail(409, "member_discount_pending", "This membership's discount is held by a checkout that hasn't finished. Finish or wait about 30 minutes, then try again.");
  }
  if (created === "sold_out") {
    return fail(409, "sold_out", "This ticket type is sold out.");
  }

  if (created.free) {
    return { ok: true, orderId: created.order.id, free: true, ticketToken: created.order.tickets[0].token };
  }

  let session: Stripe.Checkout.Session | null = null;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Payment methods come from the Stripe Dashboard (newer API versions
      // refuse payment_method_types). Delayed methods are handled in the
      // webhook via checkout.session.async_payment_succeeded / _failed.
      expires_at: Math.floor(created.expiresAt!.getTime() / 1000),
      customer_email: buyer.email,
      line_items: lineItems(event.title, ticketType.name, currency, created.prices),
      metadata: { kind: ORDER_CHECKOUT_KIND, orderId: created.order.id, eventId: event.id },
      // Lets a refund (charge.refunded) find its order without another lookup.
      payment_intent_data: { metadata: { kind: ORDER_CHECKOUT_KIND, orderId: created.order.id } },
      // The session id in the return URL proves to /order/[id] that the visitor
      // is the buyer, so the ticket links are only shown to them.
      success_url: `${input.origin}/order/${created.order.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/order/${created.order.id}?session_id={CHECKOUT_SESSION_ID}&cancelled=1`,
    });

    await db.order.update({
      where: { id: created.order.id },
      data: { stripeSessionId: session.id },
    });

    return { ok: true, orderId: created.order.id, free: false, checkoutUrl: session.url! };
  } catch (error) {
    console.error("Stripe checkout creation failed for order", created.order.id, error);
    // If the session exists but couldn't be saved, close it so nobody pays an order we cancel.
    if (session) {
      const id = session.id;
      await stripe.checkout.sessions.expire(id).catch((e) => console.error("Could not expire session", id, e));
    }
    await releaseOrder(created.order.id, "CANCELLED");
    return fail(502, "payment_failed", "Payment could not be started. Please try again.");
  }
}

/** One Stripe line for the discounted ticket (if any), one for the rest. */
function lineItems(eventTitle: string, typeName: string, currency: string, prices: { price: Prisma.Decimal; memberPricing: boolean }[]) {
  const groups = new Map<string, { price: Prisma.Decimal; member: boolean; quantity: number }>();
  for (const p of prices) {
    const key = `${p.memberPricing}:${p.price.toString()}`;
    const g = groups.get(key);
    if (g) g.quantity += 1;
    else groups.set(key, { price: p.price, member: p.memberPricing, quantity: 1 });
  }
  return [...groups.values()].map((g) => ({
    price_data: {
      currency: currency.toLowerCase(),
      product_data: { name: `${eventTitle} — ${typeName}${g.member ? " (member)" : ""}` },
      unit_amount: toMinorUnits(g.price),
    },
    quantity: g.quantity,
  }));
}

/** Stripe confirmed payment: activate the order's tickets. Safe to call twice. */
export async function markOrderPaid(orderId: string, stripeSessionId: string) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`;

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: { select: { ticketTypeId: true, memberPricing: true } },
        memberRedemption: { select: { id: true, status: true } },
        event: { select: { settings: { select: { memberDiscountAmount: true } } } },
      },
    });
    if (!order) return { updated: false as const, reason: "not_found" as const };
    if (order.stripeSessionId && order.stripeSessionId !== stripeSessionId) {
      return { updated: false as const, reason: "session_mismatch" as const };
    }
    if (order.status === "PAID") return { updated: false as const, reason: "already_paid" as const };
    if (order.status === "REFUNDED") return { updated: false as const, reason: "refunded" as const };

    // A late payment for a lapsed hold still gets its tickets: the buyer paid.
    // If that pushed the tier over capacity, or the member discount was taken
    // by another order meanwhile, flag the order for a person to look at.
    const notes: string[] = [];
    const late = order.status === "EXPIRED" || order.status === "CANCELLED";
    if (late) {
      const typeId = order.tickets[0]?.ticketTypeId;
      const type = typeId ? await tx.ticketType.findUnique({ where: { id: typeId }, select: { capacity: true } }) : null;
      if (typeId && type?.capacity != null) {
        const others = await tx.ticket.count({
          where: { ticketTypeId: typeId, orderId: { not: orderId }, ...activeTicketWhere(new Date()) },
        });
        if (others + order.tickets.length > type.capacity) {
          notes.push(`Paid after its hold lapsed; tier is now over capacity (${others + order.tickets.length}/${type.capacity}).`);
        }
      }
      const usedGuestDiscount = order.event.settings?.memberDiscountAmount != null && order.tickets.some((t) => t.memberPricing);
      if (usedGuestDiscount && !order.memberRedemption) {
        notes.push("Paid after its hold lapsed; its member discount had been taken by another order.");
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        stripeSessionId,
        ...(notes.length ? { needsReview: true, reviewNote: notes.join(" ") } : {}),
      },
    });
    await tx.ticket.updateMany({
      where: { orderId, status: { in: ["RESERVED", "VOID"] } },
      data: { status: "VALID" },
    });
    if (order.memberRedemption && order.memberRedemption.status !== "USED") {
      await tx.eventMemberRedemption.update({
        where: { id: order.memberRedemption.id },
        data: { status: "USED", usedAt: new Date() },
      });
    }
    if (notes.length) console.warn(`Order ${orderId} needs review: ${notes.join(" ")}`);
    return { updated: true as const, reason: "paid" as const };
  });
}

/** Stripe checkout expired without payment: release the held tickets and member discount. */
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
      // Keep orderId so a late payment can still find what it held.
      await tx.eventMemberRedemption.updateMany({
        where: { orderId, status: "PENDING" },
        data: { status: "RELEASED" },
      });
    }
    return { released: count > 0 };
  });
}

/**
 * The payment was fully refunded in Stripe: the tickets stop working and the
 * member discount can be used again. Partial refunds only flag the order.
 */
export async function refundOrder(orderId: string, full: boolean) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${orderId}))`;

    const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
    if (!order || order.status !== "PAID") return { refunded: false };

    if (!full) {
      await tx.order.update({
        where: { id: orderId },
        data: { needsReview: true, reviewNote: "Partially refunded in Stripe; tickets are still valid." },
      });
      return { refunded: false };
    }

    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    await tx.ticket.updateMany({ where: { orderId }, data: { status: "VOID" } });
    await tx.eventMemberRedemption.updateMany({
      where: { orderId },
      data: { status: "RELEASED", usedAt: null },
    });
    return { refunded: true };
  });
}

/** Stripe wants integer minor units (cents). */
function toMinorUnits(amount: Prisma.Decimal): number {
  return amount.mul(100).toDecimalPlaces(0).toNumber();
}
