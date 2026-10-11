
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { reserveCapacity } from "@/lib/event/reserve-capacity";
import { reserveMemberRedemption } from "@/lib/event/reserve-member-redemption";

const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";

const VALID_TIERS = ["LITE", "STANDARD", "UNLIMITED"] as const;

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Release previous checkout holds belonging to this same email.
 *
 * A hold is released only after Stripe confirms that its Checkout
 * Session has expired. Open sessions are explicitly expired first.
 * Completed or unverifiable sessions are left untouched.
 */
async function releasePreviousCheckoutHoldsForEmail(
  email: string,
  eventId: string
) {
  const holds = await db.$queryRaw<
    Array<{ stripe_session_id: string }>
  >`
    SELECT stripe_session_id
    FROM "TicketHold"
    WHERE event_id = ${eventId}
      AND expires_at > NOW()
  `;

  for (const hold of holds) {
    const oldSessionId = hold.stripe_session_id;

    try {
      let oldSession =
        await stripe.checkout.sessions.retrieve(oldSessionId);

      // Only consider sessions belonging to this event and email.
      const sessionEmail = normalizeEmail(
        oldSession.metadata?.email ??
          oldSession.customer_email ??
          ""
      );

      if (
        oldSession.metadata?.eventId !== eventId ||
        sessionEmail !== normalizeEmail(email)
      ) {
        continue;
      }

      if (oldSession.status === "open") {
        try {
          oldSession =
            await stripe.checkout.sessions.expire(oldSessionId);
        } catch {
          // The session may have completed or expired concurrently.
          oldSession =
            await stripe.checkout.sessions.retrieve(oldSessionId);
        }
      }

      // Never release a hold unless Stripe confirms expiration.
      if (oldSession.status !== "expired") {
        continue;
      }

      await db.$transaction(async (tx) => {
        await tx.$executeRaw`
          DELETE FROM "TicketHold"
          WHERE stripe_session_id = ${oldSessionId}
        `;

        await tx.$executeRaw`
          DELETE FROM "MemberRedemption"
          WHERE stripe_session_id = ${oldSessionId}
            AND status = 'pending'
        `;
      });
    } catch (error) {
      // Fail safely: if Stripe's status cannot be verified,
      // leave the hold in place rather than risk overselling.
      console.error(
        `Could not release previous checkout ${oldSessionId}:`,
        error
      );
    }
  }
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

    // Basic validation
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

    // Member validation
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

    // Get the backend-controlled ticket price and sales deadline.
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

    // Release this email's previous expired checkouts before checking
    // capacity for the new checkout. Other customers' holds are untouched.
    await releasePreviousCheckoutHoldsForEmail(email.trim(), EVENT_ID);

    // Members receive $5 off each tier.
    const basePrice = Number(ticketTier.price);
    const finalPrice = isMember
      ? Math.max(0, basePrice - 5)
      : basePrice;

    const origin =
      req.headers.get("origin") ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    // Create the new Stripe Checkout Session.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      customer_email: email.trim(),

      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name:
                tier === "LITE"
                  ? "ROCSAUT 2026 Halloween Party — Lite"
                  : tier === "STANDARD"
                    ? "ROCSAUT 2026 Halloween Party — Standard"
                    : "ROCSAUT 2026 Halloween Party — Unlimited",
            },
            unit_amount: Math.round(finalPrice * 100),
          },
          quantity: 1,
        },
      ],

      metadata: {
        eventId: EVENT_ID,
        tier,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        isMember: isMember ? "true" : "false",
        memberId: isMember ? memberId.trim() : "",
        cardName: isMember ? cardName.trim() : "",
      },

      success_url: `${origin}/event/fall-2026?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/event/fall-2026?payment=cancelled`,
    });

    // Reserve capacity using the existing database transaction and lock.
    const capacity = await reserveCapacity(
      EVENT_ID,
      tier,
      session.id
    );

    if (!capacity.success) {
      try {
        await stripe.checkout.sessions.expire(session.id);
      } catch (expireError) {
        console.error(
          "Failed to expire Stripe Checkout Session:",
          expireError
        );
      }

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

    // Reserve member pricing if applicable.
    if (isMember) {
      const memberRedemption = await reserveMemberRedemption(
        memberId.trim(),
        EVENT_ID,
        session.id
      );

      if (!memberRedemption.success) {
        await db.$executeRaw`
          DELETE FROM "TicketHold"
          WHERE id = ${capacity.holdId}
        `;

        try {
          await stripe.checkout.sessions.expire(session.id);
        } catch (expireError) {
          console.error(
            "Failed to expire Stripe Checkout Session:",
            expireError
          );
        }

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

    return NextResponse.json({
      success: true,
      message: "Checkout session created successfully.",
      checkoutUrl: session.url,
      sessionId: session.id,
      eventId: EVENT_ID,
      tier,
      price: finalPrice,
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
