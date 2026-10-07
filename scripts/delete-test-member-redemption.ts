import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/lib/db");

  await db.$executeRaw`
    DELETE FROM "MemberRedemption"
    WHERE id = ${"2a2d9019-94d1-4d6d-a500-6e7cead575c1"}
  `;

  console.log("Test member redemption deleted.");

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});