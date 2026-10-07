import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          status: "not_found",
          message: "Ticket not found",
        },
        { status: 404 }
      );
    }

    const tickets = await db.$queryRaw<
      Array<{
        id: string;
        token: string;
        name: string;
        tier: string;
        status: string;
        checked_in: boolean;
        checked_in_at: Date | null;
      }>
    >`
      SELECT
        id,
        token,
        name,
        tier,
        status,
        checked_in,
        checked_in_at
      FROM "EventTicket"
      WHERE token = ${token}
      LIMIT 1
    `;

    if (tickets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          status: "not_found",
          message: "Ticket not found",
        },
        { status: 404 }
      );
    }

    const ticket = tickets[0];

    if (ticket.status === "void") {
      return NextResponse.json({
        success: false,
        status: "void",
        message: "TICKET VOID",
        ticket: {
          name: ticket.name,
          tier: ticket.tier,
        },
      });
    }

    if (ticket.checked_in) {
      return NextResponse.json({
        success: false,
        status: "already_checked_in",
        message: "ALREADY CHECKED IN",
        checkedInAt: ticket.checked_in_at,
        ticket: {
          name: ticket.name,
          tier: ticket.tier,
        },
      });
    }

    const updated = await db.$queryRaw<
      Array<{
        name: string;
        tier: string;
        checked_in_at: Date;
      }>
    >`
      UPDATE "EventTicket"
      SET
        checked_in = TRUE,
        checked_in_at = NOW()
      WHERE id = ${ticket.id}
        AND status = 'valid'
        AND checked_in = FALSE
      RETURNING
        name,
        tier,
        checked_in_at
    `;

    if (updated.length === 0) {
      return NextResponse.json({
        success: false,
        status: "already_checked_in",
        message: "ALREADY CHECKED IN",
        ticket: {
          name: ticket.name,
          tier: ticket.tier,
        },
      });
    }

    const checkedInTicket = updated[0];

    return NextResponse.json({
      success: true,
      status: "checked_in",
      message: "CHECKED IN",
      checkedInAt: checkedInTicket.checked_in_at,
      ticket: {
        name: checkedInTicket.name,
        tier: checkedInTicket.tier,
      },
    });
  } catch (error) {
    console.error("Check-in error:", error);

    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}