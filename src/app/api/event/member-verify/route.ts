
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";

const INVALID_MEMBER_MESSAGE =
  "Member verification failed. Please check your Member ID and the name on your member card.";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const memberId = String(body.memberId ?? "").trim();
    const cardName = String(body.cardName ?? "").trim();

    if (!memberId || !cardName) {
      return NextResponse.json(
        { verified: false, message: INVALID_MEMBER_MESSAGE },
        { status: 400 }
      );
    }

    // Verify the Member ID.
    const member = await db.rOCSAUT_Membership_Info.findFirst({
      where: { member_code: memberId },
    });

    if (!member || !member.name) {
      return NextResponse.json(
        { verified: false, message: INVALID_MEMBER_MESSAGE },
        { status: 400 }
      );
    }

    // Verify the name on the membership card.
    const normalizeName = (name: string) =>
      name.trim().replace(/\s+/g, " ").toLowerCase();

    if (normalizeName(member.name) !== normalizeName(cardName)) {
      return NextResponse.json(
        { verified: false, message: INVALID_MEMBER_MESSAGE },
        { status: 400 }
      );
    }

    // Check whether this member has already used or reserved
    // the discount for this event.
    const redemptions = await db.$queryRaw<
      Array<{
        status: string;
        stripe_session_id: string | null;
      }>
    >`
      SELECT status, stripe_session_id
      FROM "MemberRedemption"
      WHERE member_id = ${memberId}
        AND event_id = ${EVENT_ID}
      LIMIT 1
    `;

    if (redemptions.length > 0) {
      const redemption = redemptions[0];

      if (redemption.status === "used") {
        return NextResponse.json(
          {
            verified: false,
            message:
              "This Member ID has already used member pricing for this event. Each member may purchase only one discounted ticket.",
          },
          { status: 400 }
        );
      }

      if (redemption.status === "pending") {
        if (!redemption.stripe_session_id) {
          return NextResponse.json(
            {
              verified: false,
              message:
                "This Member ID has a pending discount reservation. Please try again later or contact the event organizers.",
            },
            { status: 409 }
          );
        }

        try {
          const session = await stripe.checkout.sessions.retrieve(
            redemption.stripe_session_id
          );

          if (session.status !== "expired") {
            return NextResponse.json(
              {
                verified: false,
                message:
                  session.status === "complete"
                    ? "This Member ID has a checkout that is already complete or awaiting payment confirmation. Please contact the event organizers if you need help."
                    : "This Member ID is currently reserved by another checkout. Please finish that checkout or try again later.",
              },
              { status: 409 }
            );
          }

          // The checkout endpoint handles releasing or transferring
          // reservations associated with expired sessions.
        } catch (error) {
          console.error(
            "Could not verify the existing member checkout:",
            error
          );

          return NextResponse.json(
            {
              verified: false,
              message:
                "We could not confirm the status of your previous checkout. Please try again later.",
            },
            { status: 503 }
          );
        }
      }
    }

    return NextResponse.json({
      verified: true,
      memberId: member.id,
      name: member.name,
    });
  } catch (error) {
    console.error("Member verification error:", error);

    return NextResponse.json(
      {
        verified: false,
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}
