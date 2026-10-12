import { db } from "@/lib/db";

type TicketTier = "LITE" | "STANDARD" | "UNLIMITED";

type ReserveCapacityResult =
  | {
      success: true;
      holdId: string;
      expiresAt: Date;
    }
  | {
      success: false;
      reason: "tier_not_found";
    };

/**
 * Creates the 30-minute TicketHold for a checkout.
 *
 * Tickets currently have no capacity limit and no sales cutoff, so this no
 * longer refuses checkouts. The hold is still required: the Stripe webhook
 * only issues a ticket for a paid session that has a matching hold.
 * (TicketTier.capacity / sales_close_at stay in the database, unused.)
 */
export async function reserveCapacity(
  eventId: string,
  tier: TicketTier,
  stripeSessionId: string
): Promise<ReserveCapacityResult> {
  return await db.$transaction(async (tx) => {
    const tiers = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "TicketTier"
      WHERE event_id = ${eventId}
        AND tier = ${tier}
      LIMIT 1
    `;

    if (tiers.length === 0) {
      return {
        success: false,
        reason: "tier_not_found",
      };
    }

    // Tidy up expired holds for this tier.
    await tx.$executeRaw`
      DELETE FROM "TicketHold"
      WHERE event_id = ${eventId}
        AND tier = ${tier}
        AND expires_at <= NOW()
    `;

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const holds = await tx.$queryRaw<
      Array<{
        id: string;
        expires_at: Date;
      }>
    >`
      INSERT INTO "TicketHold" (
        event_id,
        tier,
        stripe_session_id,
        expires_at
      )
      VALUES (
        ${eventId},
        ${tier},
        ${stripeSessionId},
        ${expiresAt}
      )
      RETURNING id, expires_at
    `;

    return {
      success: true,
      holdId: holds[0].id,
      expiresAt: holds[0].expires_at,
    };
  });
}
