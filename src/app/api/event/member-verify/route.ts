
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";

const INVALID_MEMBER_MESSAGE =
  "Member verification failed. Please check your Member ID and the name on your member card.";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

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
    if (normalizeName(member.name) !== normalizeName(cardName)) {
      return NextResponse.json(
        { verified: false, message: INVALID_MEMBER_MESSAGE },
        { status: 400 }
      );
    }

    const redemptions = await db.$queryRaw<
      Array<{
        id: string;
        status: string;
        stripe_session_id: string | null;
      }>
    >`
      SELECT id, status, stripe_session_id
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
                "We could not confirm the status of your previous checkout. Please contact the event organizers before trying again.",
            },
            { status: 409 }
          );
        }

        const oldSessionId = redemption.stripe_session_id;

        try {
          let session =
            await stripe.checkout.sessions.retrieve(oldSessionId);

          // Ensure the previous checkout belongs to this member and event.
          if (
            session.metadata?.eventId !== EVENT_ID ||
            session.metadata?.memberId !== memberId
          ) {
            console.error(
              "Previous checkout does not match member/event:",
              oldSessionId
            );

            return NextResponse.json(
              {
                verified: false,
                message:
                  "We could not safely verify your previous checkout. Please contact the event organizers.",
              },
              { status: 409 }
            );
          }

          // Expire an open checkout when the member explicitly retries.
          if (session.status === "open") {
            try {
              session =
                await stripe.checkout.sessions.expire(oldSessionId);
            } catch {
              // The checkout may have completed or expired concurrently.
              session =
                await stripe.checkout.sessions.retrieve(oldSessionId);
            }
          }

          // Never release a reservation unless Stripe confirms expiration.
          if (session.status !== "expired") {
            return NextResponse.json(
              {
                verified: false,
                message:
                  session.status === "complete"
                    ? "Your previous checkout has completed or is awaiting payment confirmation. Please check your ticket email before trying again, or contact the event organizers if you need help."
                    : "We could not safely close your previous checkout. Please try again shortly.",
              },
              { status: 409 }
            );
          }

          // Release only records associated with the expired session.
          await db.$transaction(async (tx) => {
            await tx.$executeRaw`
              SELECT pg_advisory_xact_lock(
                hashtext(${`${memberId}:${EVENT_ID}`})
              )
            `;

            await tx.$executeRaw`
              DELETE FROM "TicketHold"
              WHERE stripe_session_id = ${oldSessionId}
            `;

            await tx.$executeRaw`
              DELETE FROM "MemberRedemption"
              WHERE member_id = ${memberId}
                AND event_id = ${EVENT_ID}
                AND stripe_session_id = ${oldSessionId}
                AND status = 'pending'
            `;
          });
        } catch (error) {
          console.error(
            "Could not safely release previous member checkout:",
            error
          );

          return NextResponse.json(
            {
              verified: false,
              message:
                "We could not confirm your previous checkout. Please try again shortly.",
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
