import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/lib/db");

  const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";
  const token = "test-ticket-2026";

  await db.$executeRaw`
    INSERT INTO "EventTicket" (
      event_id,
      token,
      name,
      email,
      phone,
      tier,
      price,
      is_member,
      member_id,
      stripe_session_id,
      status,
      waiver_accepted_at,
      waiver_version,
      age_confirmed_at
    )
    VALUES (
      ${EVENT_ID},
      ${token},
      'Test User',
      'test@example.com',
      '416-555-0100',
      'REGULAR',
      30.00,
      false,
      NULL,
      'test_session_2026',
      'valid',
      NOW(),
      'v1',
      NOW()
    )
    ON CONFLICT (stripe_session_id) DO NOTHING
  `;

  console.log("Test ticket created.");
  console.log(`Token: ${token}`);
  console.log(`URL: http://localhost:3000/ticket/${token}`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error("Failed to create test ticket:", error);
  process.exit(1);
});