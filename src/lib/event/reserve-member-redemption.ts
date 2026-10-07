import { db } from "@/lib/db";

type ReserveMemberRedemptionResult =
  | {
      success: true;
      redemptionId: string;
    }
  | {
      success: false;
      reason: "already_used" | "already_reserved";
    };

export async function reserveMemberRedemption(
  memberCode: string,
  eventId: string,
  stripeSessionId: string
): Promise<ReserveMemberRedemptionResult> {
  return await db.$transaction(async (tx) => {
    // Lock this member + event combination so two checkouts
    // cannot reserve the same member pricing at the same time.
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`${memberCode}:${eventId}`})
      )
    `;

    const existing = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        locked_at: Date | null;
      }>
    >`
      SELECT id, status, locked_at
      FROM "MemberRedemption"
      WHERE member_id = ${memberCode}
        AND event_id = ${eventId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      const created = await tx.$queryRaw<
        Array<{ id: string }>
      >`
        INSERT INTO "MemberRedemption" (
          member_id,
          event_id,
          status,
          stripe_session_id,
          locked_at
        )
        VALUES (
          ${memberCode},
          ${eventId},
          'pending',
          ${stripeSessionId},
          NOW()
        )
        RETURNING id
      `;

      return {
        success: true,
        redemptionId: created[0].id,
      };
    }

    const redemption = existing[0];

    if (redemption.status === "used") {
      return {
        success: false,
        reason: "already_used",
      };
    }

    // Still reserved by an active checkout.
    if (
      redemption.locked_at &&
      redemption.locked_at.getTime() > Date.now() - 30 * 60 * 1000
    ) {
      return {
        success: false,
        reason: "already_reserved",
      };
    }

    // Previous checkout expired, so reuse the redemption.
    const updated = await tx.$queryRaw<
      Array<{ id: string }>
    >`
      UPDATE "MemberRedemption"
      SET
        status = 'pending',
        stripe_session_id = ${stripeSessionId},
        locked_at = NOW()
      WHERE id = ${redemption.id}
      RETURNING id
    `;

    return {
      success: true,
      redemptionId: updated[0].id,
    };
  });
}