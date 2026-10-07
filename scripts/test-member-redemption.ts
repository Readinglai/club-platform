import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const { reserveMemberRedemption } = await import(
    "../src/lib/event/reserve-member-redemption"
  );

  const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";
  const MEMBER_CODE = "OTSA-2026-1001";
  const SESSION_ID = `test_member_session_${Date.now()}`;

  const result = await reserveMemberRedemption(
    MEMBER_CODE,
    EVENT_ID,
    SESSION_ID
  );

  console.log(result);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});