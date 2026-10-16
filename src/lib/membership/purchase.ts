/**
 * Buying a membership online.
 *
 *   startMembershipCheckout → Membership PENDING (placeholder code) + Stripe Checkout
 *   activateMembership (webhook: paid)    → ACTIVE, real member code, USER → MEMBER
 *   cancelMembershipCheckout (expired)    → CANCELLED
 *
 * The real code is only assigned once payment is confirmed, so abandoned
 * checkouts never use up numbers.
 */

import crypto from "crypto";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { Prisma } from "@/generated/prisma/client";
import { isProfileComplete } from "./profile";
import { termFor } from "./term";
import {
  MEMBER_CODE_PREFIX,
  MEMBERSHIP_CHECKOUT_MINUTES,
  MEMBERSHIP_CURRENCY,
  MEMBERSHIP_PRICE_CAD,
  ONLINE_MEMBER_CODE_END,
  ONLINE_MEMBER_CODE_START,
} from "./config";

/** Stripe metadata marker that routes a checkout to this flow in the webhook. */
export const MEMBERSHIP_CHECKOUT_KIND = "membership";

const PENDING_CODE_PREFIX = "PENDING-";

export type StartResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; status: number; message: string };

/** The membership covering today, if any. */
export async function getCurrentMembership(userId: string) {
  const now = new Date();
  return db.membership.findFirst({
    where: { userId, status: "ACTIVE", termStart: { lte: now }, termEnd: { gte: now } },
    orderBy: { termStart: "desc" },
  });
}

export async function startMembershipCheckout(input: {
  userId: string;
  email: string;
  name: string;
  origin: string;
}): Promise<StartResult> {
  if (!(await isProfileComplete(input.userId))) {
    return { ok: false, status: 400, message: "Please complete your profile first." };
  }
  if (await getCurrentMembership(input.userId)) {
    return { ok: false, status: 409, message: "You already have an active membership." };
  }

  const term = termFor();

  // Only one open checkout per person: close any earlier unfinished one.
  await db.membership.updateMany({
    where: { userId: input.userId, status: "PENDING", source: "STRIPE" },
    data: { status: "CANCELLED" },
  });

  const membership = await db.membership.create({
    data: {
      userId: input.userId,
      email: input.email.trim().toLowerCase(),
      name: input.name,
      memberCode: `${PENDING_CODE_PREFIX}${crypto.randomUUID()}`,
      status: "PENDING",
      source: "STRIPE",
      termStart: term.termStart,
      termEnd: term.termEnd,
    },
  });

  const termLabel = `${term.startYear}–${String(term.startYear + 1).slice(2)}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + MEMBERSHIP_CHECKOUT_MINUTES * 60,
      customer_email: membership.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: MEMBERSHIP_CURRENCY.toLowerCase(),
            product_data: { name: `ROCSAUT Membership ${termLabel}` },
            unit_amount: Math.round(MEMBERSHIP_PRICE_CAD * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { kind: MEMBERSHIP_CHECKOUT_KIND, membershipId: membership.id },
      success_url: `${input.origin}/portal/membership?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/portal/membership?cancelled=1`,
    });

    await db.membership.update({
      where: { id: membership.id },
      data: { stripeSessionId: session.id },
    });

    return { ok: true, checkoutUrl: session.url! };
  } catch (error) {
    console.error("Stripe checkout creation failed for membership", membership.id, error);
    await db.membership.update({ where: { id: membership.id }, data: { status: "CANCELLED" } });
    return { ok: false, status: 502, message: "Payment could not be started. Please try again." };
  }
}

/** Stripe confirmed payment. Safe to call twice. */
export async function activateMembership(membershipId: string, stripeSessionId: string, amountPaid: number) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${membershipId}))`;

    const membership = await tx.membership.findUnique({ where: { id: membershipId } });
    if (!membership) return { activated: false as const, reason: "not_found" as const };
    if (membership.stripeSessionId && membership.stripeSessionId !== stripeSessionId) {
      return { activated: false as const, reason: "session_mismatch" as const };
    }
    if (membership.status === "ACTIVE") return { activated: false as const, reason: "already_active" as const };

    // A late payment for a cancelled checkout still activates: the person paid.
    const memberCode = await nextMemberCode(tx, membership.termStart);

    const updated = await tx.membership.update({
      where: { id: membershipId },
      data: {
        status: "ACTIVE",
        memberCode,
        stripeSessionId,
        amountPaid: new Prisma.Decimal(amountPaid),
      },
    });

    if (updated.userId) {
      await tx.user.updateMany({ where: { id: updated.userId, role: "USER" }, data: { role: "MEMBER" } });
    }

    // TODO(Phase 3, Pass2U): issue the wallet pass here and store walletPassId,
    // once the club's Pass2U plan (API vs CSV import) is known.

    return { activated: true as const, reason: "activated" as const, membership: updated };
  });
}

export async function cancelMembershipCheckout(membershipId: string) {
  await db.membership.updateMany({
    where: { id: membershipId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}

/** Next free online code for the term, e.g. OTSA-2026-0300. Call inside a transaction. */
async function nextMemberCode(tx: Prisma.TransactionClient, termStart: Date) {
  const year = termStart.getUTCFullYear();
  const prefix = `${MEMBER_CODE_PREFIX}-${year}-`;

  // One code at a time per year, so two payments can't get the same number.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`member-code-${year}`}))`;

  const pad = (n: number) => String(n).padStart(4, "0");
  const last = await tx.membership.findFirst({
    where: {
      memberCode: { gte: `${prefix}${pad(ONLINE_MEMBER_CODE_START)}`, lte: `${prefix}${pad(ONLINE_MEMBER_CODE_END)}` },
    },
    orderBy: { memberCode: "desc" },
    select: { memberCode: true },
  });

  const next = last ? Number(last.memberCode.slice(prefix.length)) + 1 : ONLINE_MEMBER_CODE_START;
  if (next > ONLINE_MEMBER_CODE_END) {
    throw new Error(`No member codes left for ${year} (${prefix}${pad(ONLINE_MEMBER_CODE_END)} reached)`);
  }
  return `${prefix}${pad(next)}`;
}
