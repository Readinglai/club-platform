import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/lib/db");

  await db.$executeRaw`
    DELETE FROM "TicketHold"
    WHERE id = ${"e3be4561-ec26-45bf-a968-c6443527e872"}
  `;

  console.log("Test hold deleted.");

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
