/**
 * POST /api/events/[id]/orders — buy (or claim a free) ticket for an event.
 *
 * Body: { ticketTypeId, name, email, phone?, waiverAccepted }
 * Free tier → { free: true, orderId, ticketUrl }
 * Paid tier → { free: false, orderId, checkoutUrl } (redirect the buyer there)
 *
 * Logged-in buyers get the order and ticket linked to their account.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOrder } from "@/lib/ticketing/orders";
import { sendConfirmation } from "@/lib/ticketing/webhook";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const ticketTypeId = typeof body.ticketTypeId === "string" ? body.ticketTypeId : "";
  if (!ticketTypeId) {
    return NextResponse.json({ message: "Please choose a ticket type." }, { status: 400 });
  }

  const session = await auth();
  const origin =
    request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const result = await createOrder({
      eventId,
      ticketTypeId,
      buyer: {
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        phone: typeof body.phone === "string" ? body.phone : undefined,
      },
      userId: session?.user?.id ?? null,
      waiverAccepted: body.waiverAccepted === true,
      origin,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    if (result.free) {
      await sendConfirmation(result.orderId);
      return NextResponse.json({
        free: true,
        orderId: result.orderId,
        ticketUrl: `${origin}/ticket/${result.ticketToken}`,
      });
    }

    return NextResponse.json({
      free: false,
      orderId: result.orderId,
      checkoutUrl: result.checkoutUrl,
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
