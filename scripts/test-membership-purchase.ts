/**
 * Checks membership activation and member-code numbering without Stripe,
 * using the year 2099 so no real codes are taken. Test data only
 * (@test.rocsaut.invalid, codes OTSA-2099-*), removed before and after each run
 * so other tests (e.g. test-reports.ts, which also uses 2099) don't count it.
 *
 *   npx tsx --env-file=.env.local scripts/test-membership-purchase.ts
 */
import { db } from "../src/lib/db";
import { activateMembership, cancelMembershipCheckout } from "../src/lib/membership/purchase";
import { termStartingIn } from "../src/lib/membership/term";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}

async function pending(userId: string, n: number) {
  const term = termStartingIn(2099);
  return db.membership.create({
    data: {
      userId,
      email: "buyer@test.rocsaut.invalid",
      memberCode: `PENDING-test-${n}-${Date.now()}`,
      status: "PENDING",
      source: "STRIPE",
      termStart: term.termStart,
      termEnd: term.termEnd,
      stripeSessionId: `cs_test_fake_${n}_${Date.now()}`,
    },
  });
}

const cleanup = () =>
  db.membership.deleteMany({ where: { OR: [{ memberCode: { startsWith: "OTSA-2099-" } }, { memberCode: { startsWith: "PENDING-test-" } }] } });

async function main() {
  await cleanup();
  const user = await db.user.upsert({
    where: { email: "buyer@test.rocsaut.invalid" },
    create: { email: "buyer@test.rocsaut.invalid", name: "[TEST] Buyer" },
    update: { role: "USER" },
  });

  const a = await pending(user.id, 1);
  const r1 = await activateMembership(a.id, a.stripeSessionId!, 5);
  check("first payment activates", r1.activated);
  check("first online code is OTSA-2099-0300", r1.activated && r1.membership.memberCode === "OTSA-2099-0300", r1.activated ? r1.membership.memberCode : "");
  check("amount recorded", r1.activated && Number(r1.membership.amountPaid) === 5);
  const u1 = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  check("USER raised to MEMBER", u1.role === "MEMBER", u1.role);

  const again = await activateMembership(a.id, a.stripeSessionId!, 5);
  check("duplicate notification is ignored", !again.activated && again.reason === "already_active");

  const wrong = await activateMembership(a.id, "cs_test_someone_else", 5);
  check("mismatched payment rejected", !wrong.activated && wrong.reason === "session_mismatch");

  const b = await pending(user.id, 2);
  const c = await pending(user.id, 3);
  const [rb, rc] = await Promise.all([
    activateMembership(b.id, b.stripeSessionId!, 5),
    activateMembership(c.id, c.stripeSessionId!, 5),
  ]);
  const codes = [rb, rc].map((r) => (r.activated ? r.membership.memberCode : "")).sort();
  check("two payments at once get different codes", codes[0] === "OTSA-2099-0301" && codes[1] === "OTSA-2099-0302", codes.join(", "));

  const d = await pending(user.id, 4);
  await cancelMembershipCheckout(d.id);
  const dd = await db.membership.findUniqueOrThrow({ where: { id: d.id } });
  check("expired checkout is cancelled", dd.status === "CANCELLED");
  check("cancelled checkout used no code", dd.memberCode.startsWith("PENDING-"));

  const e = await pending(user.id, 5);
  const re = await activateMembership(e.id, e.stripeSessionId!, 5);
  check("next code continues without gaps", re.activated && re.membership.memberCode === "OTSA-2099-0303", re.activated ? re.membership.memberCode : "");

  await cleanup();
  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
