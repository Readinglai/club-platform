
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

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
    // Prevent concurrent checkout attempts from reserving
    // the same member discount for the same event.
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`${memberCode}:${eventId}`})
      )
    `;

    const existing = await tx.$queryRaw<
      Array<{
        id: string;
        status: string;
        stripe_session_id: string | null;
      }>
    >`
      SELECT id, status, stripe_session_id
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

    // A member who has already redeemed the discount cannot use it again.
    if (redemption.status === "used") {
      return {
        success: false,
        reason: "already_used",
      };
    }

    // The current checkout already owns this redemption.
    if (redemption.stripe_session_id === stripeSessionId) {
      return {
        success: true,
        redemptionId: redemption.id,
      };
    }

    // Verify the previous Stripe Checkout Session before transferring
    // the redemption to a new checkout.
    if (redemption.stripe_session_id) {
      try {
        let oldSession = await stripe.checkout.sessions.retrieve(
          redemption.stripe_session_id
        );

        if (oldSession.status === "open") {
          try {
            oldSession = await stripe.checkout.sessions.expire(
              redemption.stripe_session_id
            );
          } catch {
            // The old session may have completed or expired concurrently.
            // Retrieve its latest status before making a decision.
            oldSession = await stripe.checkout.sessions.retrieve(
              redemption.stripe_session_id
            );
          }
        }

        // Only an expired session can safely release the old reservation.
        if (oldSession.status !== "expired") {
          return {
            success: false,
            reason: "already_reserved",
          };
        }
      } catch (error) {
        console.error(
          "Could not verify or expire the previous member checkout:",
          error
        );

        // If Stripe's status cannot be verified, fail safely.
        return {
          success: false,
          reason: "already_reserved",
        };
      }

      // Remove only the previous checkout's hold, never the new session's.
      await tx.$executeRaw`
        DELETE FROM "TicketHold"
        WHERE stripe_session_id = ${redemption.stripe_session_id}
      `;
    }

    const updated = await tx.$queryRaw<
      Array<{ id: string }>
    >`
      UPDATE "MemberRedemption"
      SET
        status = 'pending',
        stripe_session_id = ${stripeSessionId},
        locked_at = NOW()
      WHERE id = ${redemption.id}
        AND status <> 'used'
      RETURNING id
    `;

    if (updated.length === 0) {
      return {
        success: false,
        reason: "already_used",
      };
    }

    return {
      success: true,
      redemptionId: updated[0].id,
    };
  });
}
