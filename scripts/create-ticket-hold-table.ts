import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/lib/db");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TicketHold" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      event_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      stripe_session_id TEXT UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      FOREIGN KEY (event_id)
        REFERENCES "Event"(id)
        ON DELETE CASCADE,

      CHECK (tier IN ('REGULAR', 'UNLIMITED'))
    );

    CREATE INDEX IF NOT EXISTS "TicketHold_event_id_idx"
      ON "TicketHold"(event_id);

    CREATE INDEX IF NOT EXISTS "TicketHold_expires_at_idx"
      ON "TicketHold"(expires_at);

    CREATE INDEX IF NOT EXISTS "TicketHold_event_tier_idx"
      ON "TicketHold"(event_id, tier);
  `);

  console.log("TicketHold table created.");

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});