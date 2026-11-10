/**
 * The body of an order API call, shared by /api/events/[id]/orders (any event)
 * and /api/hilo/orders (Hilo Party, phone required).
 *
 * Body: { ticketTypeId, quantity?, name, email, phone?, waiverAccepted, member?: { code, cardName } }
 * Free order → { free: true, orderId, ticketUrl }
 * Paid order → { free: false, orderId, checkoutUrl } (redirect the buyer there)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createOrder } from "./orders";
import { sendConfirmation } from "./webhook";
import { clientIp, memberFromBody, recordMemberFailure, siteOrigin, tooManyMemberFailures } from "./request";

export async function handleOrderRequest(request: Request, eventId: string, opts: { requirePhone?: boolean } = {}) {
  // Broken JSON, or valid JSON that isn't an object (null, a number, an array), is a bad request.
  const parsed: unknown = await request.json().catch(() => null);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return NextResponse.json({ code: "invalid_request", message: "Invalid request body." }, { status: 400 });
  }
  const body = parsed as Record<string, unknown>;

  const ticketTypeId = typeof body.ticketTypeId === "string" ? body.ticketTypeId : "";
  if (!ticketTypeId) {
    return NextResponse.json({ code: "type_unavailable", message: "Please choose a ticket type." }, { status: 400 });
  }

  const member = memberFromBody(body);
  const ip = clientIp(request.headers);
  if (member && tooManyMemberFailures(ip)) {
    return NextResponse.json(
      { code: "member_rate_limited", message: "Too many member checks. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  // Logged-in buyers get the order and tickets linked to their account; nobody has to log in.
  const session = await auth();
  const origin = siteOrigin();

  try {
    const result = await createOrder({
      eventId,
      ticketTypeId,
      quantity: body.quantity === undefined ? 1 : Number(body.quantity),
      buyer: {
        name: String(body.name ?? ""),
        email: String(body.email ?? ""),
        phone: typeof body.phone === "string" ? body.phone : undefined,
      },
      userId: session?.user?.id ?? null,
      waiverAccepted: body.waiverAccepted === true,
      member,
      requirePhone: opts.requirePhone,
      origin,
      lang: body.lang === "zh" ? "zh" : "en",
    });

    if (!result.ok) {
      if (result.code === "member_not_found") recordMemberFailure(ip);
      return NextResponse.json({ code: result.code, message: result.message, max: result.max }, { status: result.status });
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
      { code: "server_error", message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
