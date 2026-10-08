import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { reserveCapacity } = await import("../src/lib/event/reserve-capacity");

  const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";

  const result = await reserveCapacity(
    EVENT_ID,
    "LITE",
    `test_session_${Date.now()}`
  );

  console.log(result);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});