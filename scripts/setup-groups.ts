/**
 * Creates the club's departments and subgroups. Safe to run again: existing
 * groups (matched by slug) are left as they are.
 *
 *   npx tsx scripts/setup-groups.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { GROUP_SLUGS } from "../src/lib/access/groups";

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

const GROUPS: Array<{ slug: string; name: string; parent?: string }> = [
  { slug: GROUP_SLUGS.executive, name: "Executive" },
  { slug: GROUP_SLUGS.events, name: "Events" },
  { slug: GROUP_SLUGS.marketing, name: "Marketing" },
  { slug: GROUP_SLUGS.operations, name: "Operations" },
  { slug: GROUP_SLUGS.social, name: "Social" },
  { slug: GROUP_SLUGS.sponsorship, name: "Sponsorship / Outreach", parent: GROUP_SLUGS.operations },
  { slug: GROUP_SLUGS.finance, name: "Finance", parent: GROUP_SLUGS.operations },
  { slug: GROUP_SLUGS.it, name: "IT", parent: GROUP_SLUGS.operations },
];

async function main() {
  for (const g of GROUPS) {
    const existing = await db.group.findUnique({ where: { slug: g.slug } });
    if (existing) {
      console.log(`exists   ${g.slug}`);
      continue;
    }
    const parent = g.parent ? await db.group.findUniqueOrThrow({ where: { slug: g.parent } }) : null;
    await db.group.create({ data: { slug: g.slug, name: g.name, parentId: parent?.id ?? null } });
    console.log(`created  ${g.slug}`);
  }
}

main().finally(() => db.$disconnect());
