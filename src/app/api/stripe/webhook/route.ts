
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { sendEventTicketEmail } from "@/lib/email";

const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured.");

    return NextResponse.json(
      { error: "Webhook secret is not configured." },
      { status: 500 }
    );
  }

  const body = await req.text();

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "Stripe webhook signature verification failed:",
      error
    );

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status !== "paid") {
          break;
        }

        const metadata = session.metadata;

        if (
          !metadata ||
          metadata.eventId !== EVENT_ID ||
          !metadata.tier ||
          !metadata.name ||
          !metadata.email ||
          !metadata.phone
        ) {
          console.error(
            "Stripe session is missing required metadata:",
            session.id
          );
          break;
        }

        const tier = metadata.tier;
        const isMember = metadata.isMember === "true";
        const memberId = isMember
          ? metadata.memberId || null
          : null;

        const token = crypto.randomUUID();
        const price = (session.amount_total ?? 0) / 100;

        // Serialize processing for this Stripe Session and perform
        // ticket creation, redemption update, and hold removal atomically.
        const result = await db.$transaction(async (tx) => {
          await tx.$executeRaw`
            SELECT pg_advisory_xact_lock(
              hashtext(${session.id})
            )
          `;

          const existingTickets = await tx.$queryRaw<
            Array<{ id: string; token: string }>
          >`
            SELECT id, token
            FROM "EventTicket"
            WHERE stripe_session_id = ${session.id}
            LIMIT 1
          `;

          if (existingTickets.length > 0) {
            return {
              created: false,
              token: existingTickets[0].token,
              reason: "already_exists" as const,
            };
          }

          const holds = await tx.$queryRaw<
            Array<{ id: string }>
          >`
            SELECT id
            FROM "TicketHold"
            WHERE stripe_session_id = ${session.id}
            LIMIT 1
          `;

          if (holds.length === 0) {
            return {
              created: false,
              token: null,
              reason: "hold_missing" as const,
            };
          }

          await tx.$executeRaw`
            INSERT INTO "EventTicket" (
              event_id,
              token,
              name,
              email,
              phone,
              tier,
              price,
              is_member,
              member_id,
              stripe_session_id,
              status,
              waiver_accepted_at,
              waiver_version,
              age_confirmed_at
            )
            VALUES (
              ${EVENT_ID},
              ${token},
              ${metadata.name},
              ${metadata.email},
              ${metadata.phone},
              ${tier},
              ${price},
              ${isMember},
              ${memberId},
              ${session.id},
              'valid',
              NOW(),
              'v1',
              NOW()
            )
          `;

          if (isMember && memberId) {
            await tx.$executeRaw`
              UPDATE "MemberRedemption"
              SET status = 'used'
              WHERE member_id = ${memberId}
                AND event_id = ${EVENT_ID}
                AND stripe_session_id = ${session.id}
                AND status = 'pending'
            `;
          }

          await tx.$executeRaw`
            DELETE FROM "TicketHold"
            WHERE stripe_session_id = ${session.id}
          `;

          return {
            created: true,
            token,
            reason: "created" as const,
          };
        });

        if (result.reason === "hold_missing") {
          console.error(
            `Paid checkout has no ticket hold: ${session.id}. Manual review may be required.`
          );
          break;
        }

        if (!result.created || !result.token) {
          console.log(
            `Ticket already processed for Stripe session ${session.id}.`
          );
          break;
        }

        console.log(
          `Event ticket created successfully: ${result.token}`
        );

        const origin = process.env.NEXTAUTH_URL;

        if (!origin) {
          console.error("NEXTAUTH_URL is not configured.");
          break;
        }

        try {
          await sendEventTicketEmail({
            to: metadata.email,
            name: metadata.name,
            tier,
            price: price.toFixed(2),
            ticketUrl: `${origin}/ticket/${result.token}`,
          });

          console.log(
            `Event ticket email sent successfully to ${metadata.email}`
          );
        } catch (emailError) {
          console.error(
            `Failed to send event ticket email to ${metadata.email}:`,
            emailError
          );
        }

        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;

        await db.$transaction(async (tx) => {
          await tx.$executeRaw`
            DELETE FROM "TicketHold"
            WHERE stripe_session_id = ${session.id}
          `;

          await tx.$executeRaw`
            DELETE FROM "MemberRedemption"
            WHERE stripe_session_id = ${session.id}
              AND status = 'pending'
          `;
        });

        console.log(
          `Expired Stripe checkout cleaned up: ${session.id}`
        );

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
