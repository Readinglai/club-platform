import { db } from "@/lib/db";

type TicketTier = "LITE" | "STANDARD" | "UNLIMITED";

export async function getAvailableCapacity(
  eventId: string,
  tier: TicketTier
) {
  const result = await db.$queryRaw<
    Array<{
      capacity: number;
      sold: number;
      active_holds: number;
    }>
  >`
    SELECT
      tt.capacity,
      COUNT(DISTINCT et.id)::int AS sold,
      COUNT(DISTINCT th.id)::int AS active_holds
    FROM "TicketTier" tt
    LEFT JOIN "EventTicket" et
      ON et.event_id = tt.event_id
      AND et.tier = tt.tier
      AND et.status = 'valid'
    LEFT JOIN "TicketHold" th
      ON th.event_id = tt.event_id
      AND th.tier = tt.tier
      AND th.expires_at > NOW()
    WHERE tt.event_id = ${eventId}
      AND tt.tier = ${tier}
    GROUP BY tt.capacity
  `;

  if (result.length === 0) {
    throw new Error("Ticket tier not found.");
  }

  const { capacity, sold, active_holds } = result[0];

  return {
    capacity,
    sold,
    activeHolds: active_holds,
    available: Math.max(0, capacity - sold - active_holds),
  };
}