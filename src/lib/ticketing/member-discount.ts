/**
 * Guest member discount: a visitor who is a ROCSAUT member types their member
 * code and the name on their member card (no login). If they match an active
 * Membership, ONE ticket in their order is EventSettings.memberDiscountAmount
 * cheaper — once per member per event, across all their orders.
 *
 * The once-per-event rule is enforced in createOrder (orders.ts) with an
 * EventMemberRedemption row, inside the order's own transaction.
 */

import { db } from "@/lib/db";

/** Trim the ends and ignore letter case. Inner spaces and word order still have to match. */
export function normalizeCardName(name: string): string {
  return name.normalize("NFC").trim().toLowerCase();
}

/** Member codes are stored upper case (OTSA-2026-0001); accept any case. */
export function normalizeMemberCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * The membership these details belong to, if it is active today.
 * Returns null for every kind of mismatch, so callers can't tell (and can't
 * show) whether a code exists.
 */
export async function findMembershipForDiscount(code: string, cardName: string, now = new Date()) {
  const memberCode = normalizeMemberCode(code);
  const name = normalizeCardName(cardName);
  if (!memberCode || !name) return null;

  const membership = await db.membership.findUnique({
    where: { memberCode },
    select: { id: true, name: true, status: true, termStart: true, termEnd: true },
  });
  if (!membership || !membership.name) return null;
  if (membership.status !== "ACTIVE") return null;
  if (now < membership.termStart || now > membership.termEnd) return null;
  if (normalizeCardName(membership.name) !== name) return null;

  return { id: membership.id };
}

export type MemberCheck =
  | { ok: true; discount: number }
  | { ok: false; code: "member_not_found" | "member_discount_used" | "member_discount_pending" | "member_discount_unavailable" };

/**
 * The check the ticket page runs when a visitor presses "Verify": do these
 * details earn the discount at this event right now? createOrder checks again
 * (under a lock) when they actually buy, so this is only for showing the price.
 */
export async function checkMemberDiscount(eventId: string, code: string, cardName: string): Promise<MemberCheck> {
  const settings = await db.eventSettings.findUnique({ where: { eventId }, select: { memberDiscountAmount: true } });
  const discount = settings?.memberDiscountAmount;
  if (!discount || discount.lte(0)) return { ok: false, code: "member_discount_unavailable" };

  const membership = await findMembershipForDiscount(code, cardName);
  if (!membership) return { ok: false, code: "member_not_found" };

  const redemption = await db.eventMemberRedemption.findUnique({
    where: { membershipId_eventId: { membershipId: membership.id, eventId } },
    select: { status: true, order: { select: { status: true } } },
  });
  const holder = redemption?.order?.status;
  if (redemption?.status === "USED" || holder === "PAID" || holder === "FREE") return { ok: false, code: "member_discount_used" };
  if (redemption?.status === "PENDING" && holder === "PENDING") return { ok: false, code: "member_discount_pending" };

  return { ok: true, discount: discount.toNumber() };
}
