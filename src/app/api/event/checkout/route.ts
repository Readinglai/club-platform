import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reserveCapacity } from "@/lib/event/reserve-capacity";
import { reserveMemberRedemption } from "@/lib/event/reserve-member-redemption";

const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";

const VALID_TIERS = ["REGULAR", "UNLIMITED"] as const;

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      name,
      email,
      phone,
      tier,
      isMember,
      memberId,
      cardName,
      ageConfirmed,
      waiverAccepted,
    } = body;

    /*
     * Basic validation
     */
    if (
      !name?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !tier
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please complete all required fields.",
        },
        { status: 400 }
      );
    }

    if (!VALID_TIERS.includes(tier)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid ticket type.",
        },
        { status: 400 }
      );
    }

    if (!ageConfirmed) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must confirm that you are 19 years of age or older.",
        },
        { status: 400 }
      );
    }

    if (!waiverAccepted) {
      return NextResponse.json(
        {
          success: false,
          message: "You must agree to the waiver.",
        },
        { status: 400 }
      );
    }

    /*
     * Member validation
     */
    if (isMember) {
      if (!memberId?.trim() || !cardName?.trim()) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Please provide your Member ID and the name on your member card.",
          },
          { status: 400 }
        );
      }

      const members = await db.$queryRaw<
        Array<{
          id: string;
          member_code: string;
          name: string | null;
        }>
      >`
        SELECT id, member_code, name
        FROM "ROCSAUT Membership Info"
        WHERE member_code = ${memberId.trim()}
        LIMIT 1
      `;

      if (members.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Member verification failed. Please check your Member ID and the name on your member card.",
          },
          { status: 400 }
        );
      }

      const member = members[0];

      if (
        !member.name ||
        normalizeName(member.name) !== normalizeName(cardName)
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Member verification failed. Please check your Member ID and the name on your member card.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * Get the backend-controlled ticket price/config.
     * The frontend never determines the price.
     */
    const tiers = await db.$queryRaw<
      Array<{
        price: number;
        sales_close_at: Date;
      }>
    >`
      SELECT price, sales_close_at
      FROM "TicketTier"
      WHERE event_id = ${EVENT_ID}
        AND tier = ${tier}
      LIMIT 1
    `;

    if (tiers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Ticket type is currently unavailable.",
        },
        { status: 400 }
      );
    }

    const ticketTier = tiers[0];

    if (ticketTier.sales_close_at <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Sign-up has closed.",
        },
        { status: 400 }
      );
    }

    /*
     * Temporary reservation ID.
     *
     * Once Stripe is connected, this will be replaced with
     * the real Stripe Checkout Session ID.
     */
    const reservationId = `reservation_${crypto.randomUUID()}`;

    /*
     * Reserve capacity for 30 minutes.
     */
    const capacity = await reserveCapacity(
      EVENT_ID,
      tier,
      reservationId
    );

    if (!capacity.success) {
      if (capacity.reason === "sold_out") {
        return NextResponse.json(
          {
            success: false,
            message: "Sold out.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Ticket type is currently unavailable.",
        },
        { status: 400 }
      );
    }

    /*
     * If this is a member purchase, reserve the member pricing.
     */
    if (isMember) {
      const memberRedemption = await reserveMemberRedemption(
        memberId.trim(),
        EVENT_ID,
        reservationId
      );

      if (!memberRedemption.success) {
        // Release the capacity hold because the member
        // reservation could not be created.
        await db.$executeRaw`
          DELETE FROM "TicketHold"
          WHERE id = ${capacity.holdId}
        `;

        const message =
          memberRedemption.reason === "already_used"
            ? "This Member ID has already been used for member pricing for this event."
            : "This Member ID is currently reserved by another checkout. Please try again later.";

        return NextResponse.json(
          {
            success: false,
            message,
          },
          { status: 400 }
        );
      }
    }

    /*
     * Reservation successful.
     *
     * No Stripe session or ticket is created yet.
     */
    return NextResponse.json({
      success: true,
      message: "Ticket reserved for 30 minutes.",
      reservationId,
      eventId: EVENT_ID,
      tier,
      price: Number(ticketTier.price),
      isMember: Boolean(isMember),
      expiresAt: capacity.expiresAt,
    });
  } catch (error) {
    console.error("Checkout reservation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}