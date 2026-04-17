import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!rawUrl) throw new Error("Neither DIRECT_URL nor DATABASE_URL is set");

let connectionString = rawUrl;
try {
  const u = new URL(rawUrl);
  u.searchParams.delete("pgbouncer");
  u.searchParams.delete("connect_timeout");
  u.searchParams.delete("pool_timeout");
  connectionString = u.toString();
} catch {
  // use raw string
}

const adapter = new PrismaPg(connectionString);
const db = new PrismaClient({ adapter });

const DEPARTMENTS = [
  { slug: "event",     name: "Event",     description: "負責活動規劃與執行" },
  { slug: "marketing", name: "Marketing", description: "負責宣傳與社群媒體" },
  { slug: "operation", name: "Operation", description: "負責贊助與對外聯絡" },
];

async function main() {
  for (const dept of DEPARTMENTS) {
    await db.department.upsert({
      where: { slug: dept.slug },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
    console.log(`Upserted department: ${dept.slug}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
