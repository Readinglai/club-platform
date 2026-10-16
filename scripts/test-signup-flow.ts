/**
 * Checks Phase 2 logic with labelled test data (@test.rocsaut.invalid):
 * membership linking on sign-in, role raise, and the profile form.
 *
 *   npx tsx --env-file=.env.local scripts/test-signup-flow.ts
 */
import { db } from "../src/lib/db";
import { linkMembershipsToUser } from "../src/lib/membership/link";
import { getProfileForForm, isProfileComplete, saveProfile } from "../src/lib/membership/profile";
import { termFor } from "../src/lib/membership/term";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}

async function main() {
  const email = "signup-member@test.rocsaut.invalid";
  const term = termFor();

  // Reset this test's own data so it can run repeatedly.
  const old = await db.user.findUnique({ where: { email } });
  if (old) {
    await db.profile.deleteMany({ where: { userId: old.id } });
    await db.membership.deleteMany({ where: { userId: old.id } });
    await db.user.delete({ where: { id: old.id } });
  }
  await db.membership.deleteMany({ where: { memberCode: "TEST-SIGNUP-0001" } });

  // A membership recorded under an email, with no account yet (like the 143).
  await db.membership.create({
    data: { memberCode: "TEST-SIGNUP-0001", email, name: "[TEST] Signup Member", status: "ACTIVE", source: "MANUAL", termStart: term.termStart, termEnd: term.termEnd },
  });

  // First sign-in creates the account as USER (the database default).
  const user = await db.user.create({ data: { email: email.toUpperCase().replace("@TEST", "@test"), name: "" } });
  check("new account starts as USER", user.role === "USER", user.role);

  await linkMembershipsToUser(user.id, user.email);
  const linked = await db.membership.findUnique({ where: { memberCode: "TEST-SIGNUP-0001" } });
  check("membership linked by email (case-insensitive)", linked?.userId === user.id);
  const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  check("role raised to MEMBER while membership is active", after.role === "MEMBER", after.role);

  await linkMembershipsToUser(user.id, user.email);
  check("linking twice is harmless", (await db.membership.count({ where: { userId: user.id } })) === 1);

  check("profile starts incomplete", !(await isProfileComplete(user.id)));
  const prefill = await getProfileForForm(user.id);
  check("form loads for a new account", prefill.completed === false);

  const bad = await saveProfile(user.id, { name: "Test", phone: "" });
  check("missing required fields rejected", !bad.ok && bad.missing.includes("phone"), JSON.stringify(!bad.ok && bad.missing));
  const badEmail = await saveProfile(user.id, { name: "T", phone: "1", studentNumber: "1", program: "P", yearOfStudy: "2", personalEmail: "not-an-email" });
  check("invalid personal email rejected", !badEmail.ok);

  const good = await saveProfile(user.id, { name: "  [TEST]   Signup  Member ", phone: "416-555-0100", studentNumber: "1000000001", program: "Test Program", yearOfStudy: "2", personalEmail: "" });
  check("valid profile saved", good.ok);
  check("profile now complete", await isProfileComplete(user.id));
  const saved = await getProfileForForm(user.id);
  check("name tidied and saved on the account", saved.name === "[TEST] Signup Member", saved.name);

  // Accounts above USER are never changed by linking.
  const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true, email: true } });
  for (const a of admins) await linkMembershipsToUser(a.id, a.email);
  check("ADMIN accounts keep their role", (await db.user.count({ where: { id: { in: admins.map((a) => a.id) }, role: "ADMIN" } })) === admins.length);

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
