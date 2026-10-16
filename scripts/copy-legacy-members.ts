/**
 * Copies "ROCSAUT Membership Info" (read only, never modified) into Membership
 * as ACTIVE IMPORTED memberships for the 2026–27 term.
 *
 *   npx tsx scripts/copy-legacy-members.ts            # dry run: report only
 *   npx tsx scripts/copy-legacy-members.ts --apply    # write
 *
 * Safe to run again (rows are matched by legacyId). A row whose member code is
 * already used by a different membership is reported and skipped, not fatal.
 * Rows whose email matches an existing account are linked to it.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { termStartingIn } from "../src/lib/membership/term";

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });
const apply = process.argv.includes("--apply");
const TERM = termStartingIn(2026);

function cleanEmail(value: string | null) {
  const email = value?.trim().toLowerCase();
  return email ? email : null;
}

async function main() {
  const legacy = await db.rOCSAUT_Membership_Info.findMany({
    select: { id: true, member_code: true, name: true, email: true, personal_email: true },
    orderBy: { member_code: "asc" },
  });

  const users = await db.user.findMany({ select: { id: true, email: true } });
  const userByEmail = new Map(users.map((u) => [u.email.trim().toLowerCase(), u.id]));

  const existing = await db.membership.findMany({ select: { legacyId: true, memberCode: true } });
  const byLegacyId = new Set(existing.map((m) => m.legacyId).filter(Boolean));
  const codeOwner = new Map(existing.map((m) => [m.memberCode, m.legacyId]));

  const report = { total: legacy.length, created: 0, alreadyCopied: 0, linkedToAccount: 0, skipped: [] as string[] };

  for (const row of legacy) {
    const code = row.member_code?.trim();
    if (!code) {
      report.skipped.push(`${row.id}: no member code`);
      continue;
    }
    if (byLegacyId.has(row.id)) {
      report.alreadyCopied++;
      continue;
    }
    if (codeOwner.has(code)) {
      report.skipped.push(`${code}: code already used by another membership`);
      continue;
    }

    const email = cleanEmail(row.email) ?? cleanEmail(row.personal_email);
    const userId = (email && userByEmail.get(email)) ?? null;

    if (apply) {
      await db.membership.create({
        data: {
          legacyId: row.id,
          memberCode: code,
          name: row.name?.trim() || null,
          email,
          userId,
          status: "ACTIVE",
          source: "IMPORTED",
          termStart: TERM.termStart,
          termEnd: TERM.termEnd,
        },
      });
    }
    codeOwner.set(code, row.id);
    report.created++;
    if (userId) report.linkedToAccount++;
  }

  console.log(apply ? "APPLIED" : "DRY RUN (nothing written; add --apply to write)");
  console.log(`term:             ${TERM.termStart.toISOString()} → ${TERM.termEnd.toISOString()}`);
  console.log(`legacy rows:      ${report.total}`);
  console.log(`${apply ? "created" : "would create"}:     ${report.created} (${report.linkedToAccount} linked to an existing account)`);
  console.log(`already copied:   ${report.alreadyCopied}`);
  console.log(`skipped:          ${report.skipped.length}`);
  for (const s of report.skipped) console.log(`  - ${s}`);
}

main().finally(() => db.$disconnect());
