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
      reason: "sold_out" | "tier_not_found";
    };

export async function reserveCapacity(
  eventId: string,
  tier: TicketTier,
  stripeSessionId: string
): Promise<ReserveCapacityResult> {
  return await db.$transaction(async (tx) => {
    // Serialize capacity reservations for this event + tier.
    // This prevents two simultaneous checkouts from overselling.
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(
        hashtext(${`${eventId}:${tier}`})
      )
    `;

    const tiers = await tx.$queryRaw<
      Array<{
        id: string;
        capacity: number;
        sales_close_at: Date;
      }>
    >`
      SELECT id, capacity, sales_close_at
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

    const tierInfo = tiers[0];

    if (tierInfo.sales_close_at <= new Date()) {
      return {
        success: false,
        reason: "sold_out",
      };
    }

    // Remove expired holds before calculating availability.
    await tx.$executeRaw`
      DELETE FROM "TicketHold"
      WHERE event_id = ${eventId}
        AND tier = ${tier}
        AND expires_at <= NOW()
    `;

    const counts = await tx.$queryRaw<
      Array<{
        sold: number;
        active_holds: number;
      }>
    >`
      SELECT
        (
          SELECT COUNT(*)::int
          FROM "EventTicket"
          WHERE event_id = ${eventId}
            AND tier = ${tier}
            AND status = 'valid'
        ) AS sold,
        (
          SELECT COUNT(*)::int
          FROM "TicketHold"
          WHERE event_id = ${eventId}
            AND tier = ${tier}
            AND expires_at > NOW()
        ) AS active_holds
    `;

    const sold = counts[0]?.sold ?? 0;
    const activeHolds = counts[0]?.active_holds ?? 0;

    const available = tierInfo.capacity - sold - activeHolds;

    if (available <= 0) {
      return {
        success: false,
        reason: "sold_out",
      };
    }

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