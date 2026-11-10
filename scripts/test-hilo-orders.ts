/**
 * Automated checks for Hilo Party ordering and the guest member discount,
 * against the Hilo test event, HILO_EVENT_ID (run scripts/seed-hilo-test-event.ts
 * first). Uses the Stripe TEST key: it opens test Checkout sessions but never
 * pays them; payment, expiry and refund are simulated by calling the same
 * functions the webhook calls.
 *
 *   npx tsx scripts/test-hilo-orders.ts
 *
 * Every order it makes uses an @rocsaut.invalid email (no ticket emails are sent).
 * It deletes the test event's earlier orders first, so it can be re-run.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

// The Hilo test event (HILO_EVENT_ID in .env.local).
const EVENT_ID = process.env.HILO_EVENT_ID;
let failures = 0;

function check(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail !== undefined ? `  → ${JSON.stringify(detail)}` : ""}`);
}

async function main() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    throw new Error("Refusing to run: STRIPE_SECRET_KEY is not a test key.");
  }
  const { db } = await import("../src/lib/db");
  const { createOrder, markOrderPaid, expireOrder, refundOrder, reclaimMemberDiscount } = await import("../src/lib/ticketing/orders");
  const { stripe } = await import("../src/lib/stripe");
  const { checkMemberDiscount } = await import("../src/lib/ticketing/member-discount");

  const event = await (EVENT_ID ? db.event.findUnique({ where: { id: EVENT_ID }, include: { ticketTypes: true } }) : null);
  if (!event) throw new Error(`Run scripts/seed-hilo-test-event.ts first (no event for HILO_EVENT_ID).`);
  const live = event.ticketTypes[0];
  // The checks need room to test limits: 5 per order, 12 seats. The page's
  // real settings are put back at the end (see restore below).
  const tier = await db.ticketType.update({ where: { id: live.id }, data: { maxPerOrder: 5, capacity: 12 } });
  const restore = () => db.ticketType.update({ where: { id: live.id }, data: { maxPerOrder: live.maxPerOrder, capacity: live.capacity } });

  // Start clean: remove this test event's earlier orders, tickets and redemptions.
  await db.eventMemberRedemption.deleteMany({ where: { eventId: event.id } });
  await db.ticket.deleteMany({ where: { eventId: event.id } });
  await db.order.deleteMany({ where: { eventId: event.id } });

  const base = {
    eventId: event.id,
    ticketTypeId: tier.id,
    waiverAccepted: true,
    origin: "http://localhost:3000",
    requirePhone: true,
  };
  const buyer = (n: number) => ({ name: `Test Buyer ${n}`, email: `hilo-buyer-${n}@rocsaut.invalid`, phone: "416-555-0100" });
  const orderOf = (id: string) =>
    db.order.findUnique({ where: { id }, include: { tickets: { orderBy: { pricePaid: "asc" } }, memberRedemption: true } });

  // 1. Contact details
  let r = await createOrder({ ...base, buyer: { name: "A", email: "a@rocsaut.invalid" } });
  check("phone is required", !r.ok && r.code === "missing_details", r);
  r = await createOrder({ ...base, buyer: { name: "A", email: "not-an-email", phone: "416-555-0100" } });
  check("bad email refused", !r.ok && r.code === "invalid_email", r);
  r = await createOrder({ ...base, buyer: { name: "A", email: "a@rocsaut.invalid", phone: "12" } });
  check("bad phone refused", !r.ok && r.code === "invalid_phone", r);
  r = await createOrder({ ...base, quantity: 6, buyer: buyer(0) });
  check("more than 5 per order refused", !r.ok && r.code === "max_per_order", r);

  // 2. Member check: exact name rules
  check("member check: exact", (await checkMemberDiscount(event.id, "TEST-HILO-0001", "Test Member")).ok);
  check("member check: case + outer spaces ignored", (await checkMemberDiscount(event.id, " test-hilo-0001 ", "  tEST mEMBER ")).ok);
  check("member check: inner spaces matter", !(await checkMemberDiscount(event.id, "TEST-HILO-0001", "Test  Member")).ok);
  check("member check: word order matters", !(await checkMemberDiscount(event.id, "TEST-HILO-0001", "Member Test")).ok);
  check("member check: wrong code", !(await checkMemberDiscount(event.id, "TEST-HILO-9999", "Test Member")).ok);
  check("member check: expired membership", !(await checkMemberDiscount(event.id, "TEST-HILO-0003", "Old Member")).ok);

  // 3. Guest order, no member: 2 × $35
  r = await createOrder({ ...base, quantity: 2, buyer: buyer(1) });
  check("guest order created", r.ok && !r.free, r);
  const guest = r.ok ? await orderOf(r.orderId) : null;
  check("guest total $70, 2 reserved tickets, hold expiry set",
    guest?.totalAmount.toNumber() === 70 && guest.tickets.length === 2 && guest.tickets.every((t) => t.status === "RESERVED") && guest.expiresAt !== null,
    guest && { total: guest.totalAmount, n: guest.tickets.length, expiresAt: guest.expiresAt });

  // 4. Member order: 3 tickets, $5 off exactly one → $100
  const member = { code: "TEST-HILO-0001", cardName: "Test Member" };
  r = await createOrder({ ...base, quantity: 3, buyer: buyer(2), member });
  check("member order created", r.ok, r);
  const m1 = r.ok ? await orderOf(r.orderId) : null;
  check("member total $100 (30 + 35 + 35)", m1?.totalAmount.toNumber() === 100, m1?.totalAmount);
  check("exactly one ticket at member price",
    m1?.tickets.filter((t) => t.memberPricing).length === 1 && m1.tickets[0].pricePaid.toNumber() === 30,
    m1?.tickets.map((t) => [t.pricePaid, t.memberPricing]));
  check("redemption PENDING", m1?.memberRedemption?.status === "PENDING", m1?.memberRedemption);

  // 5. Same member comes back without paying (pressed back / closed the tab):
  //    Verify closes the unpaid checkout and the discount is free again.
  const heldCheck = await checkMemberDiscount(event.id, member.code, member.cardName);
  check("without reclaiming, verify reports the discount as held", !heldCheck.ok && heldCheck.code === "member_discount_pending", heldCheck);
  const again = await checkMemberDiscount(event.id, member.code, member.cardName, (id) => reclaimMemberDiscount(id, event.id));
  check("coming back unpaid: verify succeeds", again.ok, again);
  const abandoned = await orderOf(m1!.id);
  check("abandoned order: CANCELLED, tickets VOID, redemption RELEASED",
    abandoned?.status === "CANCELLED" && abandoned.tickets.every((t) => t.status === "VOID") && abandoned.memberRedemption?.status === "RELEASED",
    { status: abandoned?.status, redemption: abandoned?.memberRedemption?.status });
  const leftSession = await stripe.checkout.sessions.retrieve(m1!.stripeSessionId!);
  check("abandoned Stripe checkout can no longer be paid", leftSession.status === "expired", leftSession.status);

  //    Buying again straight away (without pressing Verify) also takes it over.
  r = await createOrder({ ...base, buyer: buyer(3), member });
  check("new order gets the discount", r.ok, r);
  const mB = r.ok ? await orderOf(r.orderId) : null;
  r = await createOrder({ ...base, buyer: buyer(3), member });
  check("ordering again moves the discount to the newest order", r.ok, r);
  const mBLeft = await orderOf(mB!.id);
  check("previous unpaid order cancelled", mBLeft?.status === "CANCELLED", mBLeft?.status);
  const m1b = r.ok ? await orderOf(r.orderId) : null;

  // 6. Checkout expires → discount released → can be used again
  await expireOrder(m1b!.id);
  const expired = await orderOf(m1b!.id);
  check("expired order: EXPIRED, tickets VOID, redemption RELEASED",
    expired?.status === "EXPIRED" && expired.tickets.every((t) => t.status === "VOID") && expired.memberRedemption?.status === "RELEASED",
    { status: expired?.status, redemption: expired?.memberRedemption?.status });

  r = await createOrder({ ...base, buyer: buyer(4), member });
  check("discount usable again after expiry", r.ok, r);
  const m2 = r.ok ? await orderOf(r.orderId) : null;
  const redemptionRows = await db.eventMemberRedemption.count({ where: { eventId: event.id } });
  check("still one redemption row (re-used, not duplicated)", redemptionRows === 1, redemptionRows);

  // 7. Payment → USED; duplicate webhook is harmless; member can't use it again
  const p1 = await markOrderPaid(m2!.id, m2!.stripeSessionId!);
  const p2 = await markOrderPaid(m2!.id, m2!.stripeSessionId!);
  const paid = await orderOf(m2!.id);
  check("paid: PAID, ticket VALID, redemption USED",
    p1.updated && paid?.status === "PAID" && paid.tickets.every((t) => t.status === "VALID") && paid.memberRedemption?.status === "USED",
    { p1, status: paid?.status, redemption: paid?.memberRedemption?.status });
  check("duplicate webhook ignored", !p2.updated && p2.reason === "already_paid", p2);
  r = await createOrder({ ...base, buyer: buyer(5), member });
  check("discount refused after it was used", !r.ok && r.code === "member_discount_used", r);
  r = await createOrder({ ...base, buyer: buyer(5) });
  check("same person can still buy at full price", r.ok, r);
  const full = r.ok ? await orderOf(r.orderId) : null;
  if (full) await expireOrder(full.id);

  // 8. Two simultaneous checkouts by the same member: only one gets the discount
  const race = { code: "TEST-HILO-0002", cardName: "Race Tester" };
  const [a, b] = await Promise.all([
    createOrder({ ...base, buyer: buyer(6), member: race }),
    createOrder({ ...base, buyer: buyer(7), member: race }),
  ]);
  check("concurrent: exactly one succeeds", [a, b].filter((x) => x.ok).length === 1, [a, b]);
  const loser = [a, b].find((x) => !x.ok);
  check("concurrent: the other is told the discount is held", loser !== undefined && !loser.ok && loser.code === "member_discount_pending", loser);
  const winner = [a, b].find((x) => x.ok);
  if (winner?.ok) await expireOrder(winner.orderId);

  // 9. Refund → tickets VOID, discount released
  const refund = await refundOrder(m2!.id, true);
  const refunded = await orderOf(m2!.id);
  check("refund: REFUNDED, tickets VOID, redemption RELEASED",
    refund.refunded && refunded?.status === "REFUNDED" && refunded.tickets.every((t) => t.status === "VOID") && refunded.memberRedemption?.status === "RELEASED",
    { status: refunded?.status, redemption: refunded?.memberRedemption?.status });
  check("refunded order can't be revived by a late webhook", !(await markOrderPaid(m2!.id, m2!.stripeSessionId!)).updated);

  // 10. Sold out: capacity 12. Guest order (2) still holds; fill the rest.
  const held = await db.ticket.count({ where: { eventId: event.id, status: { in: ["VALID", "RESERVED"] } } });
  const fillers: string[] = [];
  let left = (tier.capacity ?? 0) - held;
  let n = 10;
  while (left > 0) {
    const q = Math.min(5, left);
    const f = await createOrder({ ...base, quantity: q, buyer: buyer(n++) });
    if (f.ok) fillers.push(f.orderId);
    left -= q;
  }
  r = await createOrder({ ...base, buyer: buyer(99) });
  check("sold out when capacity is reached", !r.ok && r.code === "sold_out", r);

  // 11. Late payment for an expired order while full → paid, but flagged for review
  await expireOrder(fillers[0]);
  const refill = await createOrder({ ...base, quantity: 5, buyer: buyer(98) }).catch(() => null);
  const fillerSession = (await db.order.findUnique({ where: { id: fillers[0] } }))!.stripeSessionId!;
  await markOrderPaid(fillers[0], fillerSession);
  const late = await db.order.findUnique({ where: { id: fillers[0] } });
  check("late payment over capacity: PAID and needsReview", late?.status === "PAID" && late.needsReview, { status: late?.status, needsReview: late?.needsReview, note: late?.reviewNote, refill: refill?.ok });

  // Tidy up: close the still-open test checkouts at Stripe.
  const open = await db.order.findMany({ where: { eventId: event.id, status: "PENDING", stripeSessionId: { not: null } } });
  for (const o of open) {
    await stripe.checkout.sessions.expire(o.stripeSessionId!).catch(() => undefined);
    await expireOrder(o.id);
  }
  // Clear the test orders so the page shows every seat, and restore its limits.
  await db.eventMemberRedemption.deleteMany({ where: { eventId: event.id } });
  await db.ticket.deleteMany({ where: { eventId: event.id } });
  await db.order.deleteMany({ where: { eventId: event.id } });
  await restore();

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  await db.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
