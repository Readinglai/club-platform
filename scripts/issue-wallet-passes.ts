/**
 * Issues Pass2U wallet passes for active memberships that don't have one yet
 * (failed attempts, or imported members). Each pass costs 3 Pass2U credits.
 *
 *   npx tsx --env-file=.env.local scripts/issue-wallet-passes.ts            # dry run: list + credit cost
 *   npx tsx --env-file=.env.local scripts/issue-wallet-passes.ts --apply    # issue
 *   ... --only-online   # skip imported members (source IMPORTED)
 */
import { db } from "../src/lib/db";
import { createMemberPass, walletPassesEnabled } from "../src/lib/membership/wallet-pass";

const apply = process.argv.includes("--apply");
const onlyOnline = process.argv.includes("--only-online");
const CREDITS_PER_PASS = 3;

async function main() {
  const now = new Date();
  const missing = await db.membership.findMany({
    where: {
      status: "ACTIVE",
      walletPassId: null,
      termEnd: { gte: now },
      ...(onlyOnline ? { source: { not: "IMPORTED" } } : {}),
      // Never spend credits on test data (members without an email still count).
      OR: [{ email: null }, { NOT: { email: { endsWith: ".invalid" } } }],
    },
    orderBy: { memberCode: "asc" },
    select: { id: true, name: true, memberCode: true, termEnd: true, source: true },
  });

  console.log(`${missing.length} active membership(s) without a pass → ${missing.length * CREDITS_PER_PASS} Pass2U credits`);
  if (!apply) {
    console.log("DRY RUN (nothing issued; add --apply to issue)");
    return;
  }
  if (!walletPassesEnabled()) {
    console.error("Wallet passes are off: set PASS2U_API_KEY and PASS2U_MODEL_ID first.");
    process.exitCode = 1;
    return;
  }

  let issued = 0;
  for (const m of missing) {
    try {
      const passId = await createMemberPass(m);
      if (!passId) continue;
      await db.membership.update({ where: { id: m.id }, data: { walletPassId: passId } });
      issued++;
      console.log(`issued  ${m.memberCode}`);
    } catch (error) {
      console.error(`failed  ${m.memberCode}: ${error instanceof Error ? error.message : error}`);
    }
  }
  console.log(`issued ${issued}/${missing.length}`);
}

main().finally(() => db.$disconnect());
