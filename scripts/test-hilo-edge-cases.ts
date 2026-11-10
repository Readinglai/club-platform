/**
 * Edge cases for the Hilo Party ordering flow, run against a THROWAWAY event
 * so the real Hilo event and anyone's test orders are never touched:
 *   - event "[TEST] Hilo edge cases" (unpublished), its settings and one tier
 *   - memberships TEST-EDGE-0001…0004 (emails @rocsaut.invalid)
 * All of it is deleted at the end, pass or fail.
 *
 * Uses the Stripe TEST key: opens test Checkout sessions, never pays them.
 * Payment, expiry and refund are simulated by calling what the webhook calls.
 *
 *   npx tsx scripts/test-hilo-edge-cases.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail !== undefined ? `  → ${JSON.stringify(detail)}` : ""}`);
}

const TITLE = "[TEST] Hilo edge cases";
const DAY = 86_400_000;

async function main() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Refusing to run: STRIPE_SECRET_KEY is not a test key.");
  const { db } = await import("../src/lib/db");
  const { Prisma } = await import("../src/generated/prisma/client");
  const orders = await import("../src/lib/ticketing/orders");
  const { createOrder, markOrderPaid, expireOrder, refundOrder, cancelUnpaidOrder } = orders;
  const { checkMemberDiscount } = await import("../src/lib/ticketing/member-discount");
  const { confirmFromStripe } = await import("../src/lib/ticketing/webhook");
  const { getPublicEvent } = await import("../src/lib/events/public");
  const { stripe } = await import("../src/lib/stripe");

  // ---- Setup -------------------------------------------------------------
  const now = Date.now();
  const event = await db.event.create({
    data: { title: TITLE, startAt: new Date(now + 15 * DAY), endAt: new Date(now + 15 * DAY + 4 * 3600_000), location: "Nowhere", published: false },
  });
  const cleanup = async () => {
    await db.eventMemberRedemption.deleteMany({ where: { eventId: event.id } });
    await db.ticket.deleteMany({ where: { eventId: event.id } });
    await db.order.deleteMany({ where: { eventId: event.id } });
    await db.ticketType.deleteMany({ where: { eventId: event.id } });
    await db.eventSettings.deleteMany({ where: { eventId: event.id } });
    await db.event.delete({ where: { id: event.id } });
    await db.membership.deleteMany({ where: { memberCode: { startsWith: "TEST-EDGE-" } } });
  };

  try {
    await db.eventSettings.create({
      data: { eventId: event.id, ticketsEnabled: true, memberDiscountAmount: new Prisma.Decimal(5), timezone: "America/Toronto", currency: "CAD" },
    });
    const tier = await db.ticketType.create({
      data: { eventId: event.id, name: "General Admission", price: new Prisma.Decimal(35), capacity: 3, maxPerOrder: 1 },
    });
    const term = { termStart: new Date(now - 30 * DAY), termEnd: new Date(now + 300 * DAY) };
    const mk = (memberCode: string, name: string, extra: object = {}) =>
      db.membership.create({ data: { memberCode, name, email: `${memberCode.toLowerCase()}@rocsaut.invalid`, status: "ACTIVE", source: "MANUAL", ...term, ...extra } });
    await mk("TEST-EDGE-0001", "Edge Member");
    await mk("TEST-EDGE-0002", "Yu-Chen Lin");
    await mk("TEST-EDGE-0003", "Lapsed Member", { termStart: new Date(now - 400 * DAY), termEnd: new Date(now - 1000) });
    await mk("TEST-EDGE-0004", "Cancelled Member", { status: "CANCELLED" });
    await mk("TEST-EDGE-0005", "Future Member", { termStart: new Date(now + DAY), termEnd: new Date(now + 300 * DAY) });

    const base = { eventId: event.id, ticketTypeId: tier.id, waiverAccepted: true, origin: "http://localhost:3000", requirePhone: true };
    let n = 0;
    const buyer = () => ({ name: `Edge Buyer ${++n}`, email: `edge-${n}@rocsaut.invalid`, phone: "416-555-0100" });
    const member1 = { code: "TEST-EDGE-0001", cardName: "Edge Member" };
    const setTier = (data: object) => db.ticketType.update({ where: { id: tier.id }, data });
    const setSettings = (data: object) => db.eventSettings.update({ where: { eventId: event.id }, data });
    const orderOf = (id: string) => db.order.findUniqueOrThrow({ where: { id }, include: { tickets: true, memberRedemption: true } });
    const resetOrders = async () => {
      await db.eventMemberRedemption.deleteMany({ where: { eventId: event.id } });
      await db.ticket.deleteMany({ where: { eventId: event.id } });
      await db.order.deleteMany({ where: { eventId: event.id } });
    };

    // ---- 1. Input the page wouldn't send ----------------------------------
    console.log("\n# Odd input");
    const bad = async (label: string, extra: object, code: string) => {
      const r = await createOrder({ ...base, buyer: buyer(), ...extra });
      check(label, !r.ok && r.code === code, r);
    };
    await bad("quantity 2 refused (1 per order)", { quantity: 2 }, "max_per_order");
    await bad("quantity 0 refused", { quantity: 0 }, "invalid_quantity");
    await bad("quantity -1 refused", { quantity: -1 }, "invalid_quantity");
    await bad("quantity 1.5 refused", { quantity: 1.5 }, "invalid_quantity");
    await bad("quantity NaN refused", { quantity: NaN }, "invalid_quantity");
    await bad("name of only spaces refused", { buyer: { name: "   ", email: "x@rocsaut.invalid", phone: "4165550100" } }, "missing_details");
    await bad("101-character name refused", { buyer: { name: "A".repeat(101), email: "x@rocsaut.invalid", phone: "4165550100" } }, "too_long");
    await bad("very long phone refused", { buyer: { name: "A", email: "x@rocsaut.invalid", phone: "416" + " ".repeat(40) + "5550100" } }, "too_long");
    await bad("very long member code refused", { member: { code: "X".repeat(51), cardName: "A" } }, "too_long");
    await bad("phone '-------' refused", { buyer: { name: "A", email: "x@rocsaut.invalid", phone: "-------" } }, "invalid_phone");
    await bad("email with a space refused", { buyer: { name: "A", email: "a b@rocsaut.invalid", phone: "4165550100" } }, "invalid_email");
    await bad("waiver not accepted refused", { waiverAccepted: false }, "waiver_required");
    await bad("ticket type from another event refused", { ticketTypeId: "not-a-real-tier" }, "type_unavailable");

    // ---- 2. Last-minute changes by organisers -----------------------------
    console.log("\n# Organisers change things at the last minute");
    await setTier({ salesStartAt: new Date(Date.now() + 60_000) });
    await bad("before sales open: refused", {}, "not_started");
    let pub = await getPublicEvent(event.id, null, { allowUnpublished: true });
    check("before sales open: page shows 'not started' with the opening time", pub?.tiers[0].state === "not_started" && !!pub.tiers[0].salesStartAt, pub?.tiers[0]);
    await setTier({ salesStartAt: new Date(Date.now() - 1000), salesEndAt: new Date(Date.now() - 1) });
    await bad("after sales close: refused", {}, "ended");
    pub = await getPublicEvent(event.id, null, { allowUnpublished: true });
    check("after sales close: page shows 'ended'", pub?.tiers[0].state === "ended", pub?.tiers[0]);
    await setTier({ salesStartAt: null, salesEndAt: null });
    await setSettings({ ticketsEnabled: false });
    await bad("tickets switched off: refused", {}, "tickets_unavailable");
    await setSettings({ ticketsEnabled: true });
    await setTier({ active: false });
    await bad("ticket type deactivated: refused", {}, "type_unavailable");
    await setTier({ active: true });

    // Price raised after the page loaded: the order and Stripe use the new price.
    await setTier({ price: new Prisma.Decimal(40) });
    let r = await createOrder({ ...base, buyer: buyer() });
    if (r.ok && !r.free) {
      const o = await orderOf(r.orderId);
      const session = await stripe.checkout.sessions.retrieve(o.stripeSessionId!);
      check("price changed: order and Stripe both charge the new $40", o.totalAmount.equals(40) && session.amount_total === 4000, { db: o.totalAmount, stripe: session.amount_total });
      await cancelUnpaidOrder(o.id, o.stripeSessionId!);
    } else check("price changed: order created", false, r);
    await setTier({ price: new Prisma.Decimal(35) });

    // Discount switched off between "Verify" and "Pay".
    check("member verifies while discount is on", (await checkMemberDiscount(event.id, member1.code, member1.cardName)).ok);
    await setSettings({ memberDiscountAmount: null });
    await bad("discount switched off after verifying: order refused, not silently full price", { member: member1 }, "member_discount_unavailable");
    // Discount set bigger than the price: ticket becomes free, no payment.
    await setSettings({ memberDiscountAmount: new Prisma.Decimal(50) });
    r = await createOrder({ ...base, buyer: buyer(), member: member1 });
    check("discount bigger than the price: member ticket becomes FREE (no Stripe) ⚠ watch this setting", r.ok && r.free, r);
    await resetOrders();
    await setSettings({ memberDiscountAmount: new Prisma.Decimal(5) });

    // Capacity lowered below what's already sold.
    for (let i = 0; i < 2; i++) await createOrder({ ...base, buyer: buyer() });
    await setTier({ capacity: 1 });
    await bad("capacity cut below tickets held: further orders refused", {}, "sold_out");
    pub = await getPublicEvent(event.id, null, { allowUnpublished: true });
    check("capacity cut: page shows sold out with 0 left (not negative)", pub?.tiers[0].state === "sold_out" && pub.tiers[0].remaining === 0, pub?.tiers[0]);
    await resetOrders();
    await setTier({ capacity: 3 });

    // ---- 3. Rush: more buyers than seats at the same moment ---------------
    console.log("\n# Ticket rush");
    const rush = await Promise.all(Array.from({ length: 10 }, () => createOrder({ ...base, buyer: buyer() })));
    const won = rush.filter((x) => x.ok);
    check("10 buyers at once for 3 seats: exactly 3 get a checkout", won.length === 3, rush.map((x) => (x.ok ? "ok" : x.code)));
    check("the other 7 are told sold out", rush.filter((x) => !x.ok && x.code === "sold_out").length === 7);
    const held = await db.ticket.count({ where: { ticketTypeId: tier.id, status: { in: ["RESERVED", "VALID"] } } });
    check("database holds exactly 3 tickets", held === 3, held);

    // Buyer presses "back" on Stripe: seat comes back immediately.
    const first = won[0] as Extract<typeof won[number], { free: false }>;
    const firstOrder = await orderOf(first.orderId);
    check("cancel with someone else's session id does nothing", !(await cancelUnpaidOrder(first.orderId, "cs_test_wrong")));
    check("cancel from Stripe's back link frees the order", await cancelUnpaidOrder(first.orderId, firstOrder.stripeSessionId!));
    const s1 = await stripe.checkout.sessions.retrieve(firstOrder.stripeSessionId!);
    check("…and its Stripe checkout can no longer be paid", s1.status === "expired", s1.status);
    check("…and a second cancel is a no-op", !(await cancelUnpaidOrder(first.orderId, firstOrder.stripeSessionId!)));
    r = await createOrder({ ...base, buyer: buyer() });
    check("the freed seat can be bought right away", r.ok, r);

    // Stripe's expiry webhook frees a seat too.
    const second = await orderOf((won[1] as { orderId: string }).orderId);
    await expireOrder(second.id);
    r = await createOrder({ ...base, buyer: buyer() });
    check("seat freed by an expired checkout can be bought", r.ok, r);

    // ---- 4. Payment edge cases --------------------------------------------
    console.log("\n# Payments");
    const third = await orderOf((won[2] as { orderId: string }).orderId);
    await confirmFromStripe(third.id, third.stripeSessionId!);
    check("order page's Stripe check doesn't mark an UNPAID checkout as paid", (await orderOf(third.id)).status === "PENDING");
    check("payment for a different session is rejected", (await markOrderPaid(third.id, "cs_test_other")).reason === "session_mismatch");
    check("payment applied", (await markOrderPaid(third.id, third.stripeSessionId!)).updated);
    check("same payment webhook twice: second is ignored (one email)", (await markOrderPaid(third.id, third.stripeSessionId!)).reason === "already_paid");
    check("tickets valid after payment", (await orderOf(third.id)).tickets.every((t) => t.status === "VALID"));
    check("expiry arriving after payment doesn't undo it", !(await expireOrder(third.id)).released && (await orderOf(third.id)).status === "PAID");
    check("cancel link after payment doesn't undo it", !(await cancelUnpaidOrder(third.id, third.stripeSessionId!)) && (await orderOf(third.id)).status === "PAID");

    // Late payment for an order whose hold lapsed while the event filled up.
    const lateId = first.orderId; // cancelled above, seat resold
    const late = await markOrderPaid(lateId, firstOrder.stripeSessionId!);
    const lateOrder = await orderOf(lateId);
    check("late payment still gets its ticket, and is flagged for review when over capacity",
      late.updated && lateOrder.status === "PAID" && lateOrder.needsReview === true, { late, needsReview: lateOrder.needsReview, note: lateOrder.reviewNote });

    // Refund
    check("full refund voids the ticket", (await refundOrder(third.id, true)).refunded && (await orderOf(third.id)).tickets.every((t) => t.status === "VOID"));
    check("payment arriving after a refund doesn't revive it", (await markOrderPaid(third.id, third.stripeSessionId!)).reason === "refunded");
    await resetOrders();

    // ---- 5. Member verification -------------------------------------------
    console.log("\n# Member verification");
    const verify = (code: string, name: string) => checkMemberDiscount(event.id, code, name).then((x) => x.ok);
    check("exact details verify", await verify("TEST-EDGE-0001", "Edge Member"));
    check("lower-case code and name, extra outer spaces verify", await verify("  test-edge-0001 ", " edge member  "));
    check("wrong name refused", !(await verify("TEST-EDGE-0001", "Edge Membr")));
    check("someone else's name with this code refused", !(await verify("TEST-EDGE-0001", "Yu-Chen Lin")));
    check("hyphenated name verifies as on the card", await verify("TEST-EDGE-0002", "yu-chen lin"));
    check("hyphenated name typed without the hyphen is refused (strict match)", !(await verify("TEST-EDGE-0002", "Yu Chen Lin")));
    check("membership past its end date refused", !(await verify("TEST-EDGE-0003", "Lapsed Member")));
    check("cancelled membership refused", !(await verify("TEST-EDGE-0004", "Cancelled Member")));
    check("membership not started yet refused", !(await verify("TEST-EDGE-0005", "Future Member")));
    check("empty name refused", !(await verify("TEST-EDGE-0001", "")));
    const bothWrong = await checkMemberDiscount(event.id, "TEST-EDGE-9999", "Nobody");
    const nameWrong = await checkMemberDiscount(event.id, "TEST-EDGE-0001", "Nobody");
    check("wrong code and wrong name give the same answer (can't probe which codes exist)", JSON.stringify(bothWrong) === JSON.stringify(nameWrong), { bothWrong, nameWrong });

    // Member pays $30; the discount is used only once paid.
    r = await createOrder({ ...base, buyer: buyer(), member: member1 });
    const m1 = r.ok && !r.free ? await orderOf(r.orderId) : null;
    check("member order charges $30", !!m1 && m1.totalAmount.equals(30), r);
    // Same member opens a second checkout (other tab / friend with their details): the first is closed.
    r = await createOrder({ ...base, buyer: buyer(), member: member1 });
    const m2 = r.ok && !r.free ? await orderOf(r.orderId) : null;
    const m1After = m1 ? await orderOf(m1.id) : null;
    check("second checkout with the same member takes over; the first is cancelled", !!m2 && m1After?.status === "CANCELLED", { m2: !!m2, m1: m1After?.status });
    const s2 = m1 ? await stripe.checkout.sessions.retrieve(m1.stripeSessionId!) : null;
    check("…and the first Stripe checkout can't be paid any more (no double discount)", s2?.status === "expired", s2?.status);
    // Pay the second.
    await markOrderPaid(m2!.id, m2!.stripeSessionId!);
    check("after paying: Verify says 'already used'", (await checkMemberDiscount(event.id, member1.code, member1.cardName)).ok === false);
    await bad("after paying: a new member order is refused", { member: member1 }, "member_discount_used");

    // Many tabs at once with the same member.
    await resetOrders();
    const burst = await Promise.all(Array.from({ length: 5 }, () => createOrder({ ...base, buyer: buyer(), member: member1 })));
    const pendingWithDiscount = await db.order.count({ where: { eventId: event.id, status: "PENDING", tickets: { some: { memberPricing: true } } } });
    const redemptions = await db.eventMemberRedemption.count({ where: { eventId: event.id } });
    check("5 checkouts at once with one member: at most one is left holding the discount", pendingWithDiscount <= 1 && redemptions === 1,
      { results: burst.map((x) => (x.ok ? "ok" : x.code)), pendingWithDiscount, redemptions });
    // Capacity 3 still respected even with the member burst.
    const active = await db.ticket.count({ where: { ticketTypeId: tier.id, ...orders.activeTicketWhere(new Date()) } });
    check("seats held never exceed capacity", active <= 3, active);
  } finally {
    await cleanup();
    const left = await db.event.count({ where: { title: TITLE } });
    const members = await db.membership.count({ where: { memberCode: { startsWith: "TEST-EDGE-" } } });
    console.log(`\nCleanup: ${left} test events and ${members} test members left (should be 0 and 0).`);
  }

  console.log(failures ? `\n${failures} FAILED` : "\nAll checks passed.");
  await db.$disconnect();
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
