import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";
import { hiloEventId } from "@/lib/hilo";

// The door scanner admits Hilo Party tickets only (HILO_EVENT_ID). A ticket
// for any other event, Halloween's EventTicket included, is refused as
// "wrong_event" and nothing is written.
const HALLOWEEN_TITLE = "2026 ROCSAUT Halloween Party";

function wrongEvent(eventTitle: string, ticket?: { name: string; tier: string }) {
  return NextResponse.json({
    success: false,
    status: "wrong_event",
    message: "WRONG EVENT",
    eventTitle,
    ticket,
  });
}

export async function POST(req: NextRequest) {
  try {
    const staffCode = process.env.STAFF_CHECKIN_CODE;

    if (!staffCode) {
      console.error("STAFF_CHECKIN_CODE is not configured.");

      return NextResponse.json(
        {
          success: false,
          status: "unauthorized",
          message: "Staff check-in is not configured.",
        },
        { status: 500 }
      );
    }

    const staffCookie = req.cookies.get("rocsaut_staff_checkin")?.value;

    const expectedToken = crypto
      .createHash("sha256")
      .update(`rocsaut-staff-checkin:${staffCode}`)
      .digest("hex");

    if (!staffCookie || staffCookie !== expectedToken) {
      return NextResponse.json(
        {
          success: false,
          status: "unauthorized",
          message: "Staff verification required.",
        },
        { status: 401 }
      );
    }

    const eventId = hiloEventId();

    if (!eventId) {
      console.error("HILO_EVENT_ID is not configured; the door scanner has no event.");
      return NextResponse.json(
        {
          success: false,
          status: "error",
          message: "Scanner has no event set (HILO_EVENT_ID).",
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const token = String(body?.token ?? "").trim();

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

    // Tickets from the Order/Ticket tables first, then Halloween's EventTicket.
    const entry = await db.ticket.findUnique({
      where: { token },
      include: {
        ticketType: { select: { name: true, color: true, perks: true } },
        event: { select: { title: true } },
      },
    });

    if (entry) {
      // Unpaid holds are "not found" whatever the event, so a half-finished
      // checkout never shows up at the door.
      if (entry.status === "RESERVED") {
        return NextResponse.json(
          { success: false, status: "not_found", message: "Ticket not found" },
          { status: 404 }
        );
      }

      if (entry.eventId !== eventId) {
        return wrongEvent(entry.event.title, {
          name: entry.holderName,
          tier: entry.ticketType.name,
        });
      }

      const ticketInfo = {
        name: entry.holderName,
        tier: entry.ticketType.name,
        color: entry.ticketType.color,
        perks: entry.ticketType.perks,
      };

      if (entry.status === "VOID") {
        return NextResponse.json({
          success: false,
          status: "void",
          message: "TICKET VOID",
          ticket: ticketInfo,
        });
      }

      const checkedInAt = new Date();
      const { count } = await db.ticket.updateMany({
        where: { id: entry.id, status: "VALID", checkedInAt: null },
        data: { checkedInAt },
      });

      if (count === 0) {
        const current = await db.ticket.findUnique({
          where: { id: entry.id },
          select: { checkedInAt: true },
        });
        return NextResponse.json({
          success: false,
          status: "already_checked_in",
          message: "ALREADY CHECKED IN",
          checkedInAt: current?.checkedInAt ?? null,
          ticket: ticketInfo,
        });
      }

      return NextResponse.json({
        success: true,
        status: "checked_in",
        message: "CHECKED IN",
        checkedInAt,
        ticket: ticketInfo,
      });
    }

    const tickets = await db.$queryRaw<Array<{ name: string; tier: string }>>`
      SELECT name, tier
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

    // Every EventTicket belongs to the Halloween party, never to this event.
    const ticket = tickets[0];
    return wrongEvent(HALLOWEEN_TITLE, { name: ticket.name, tier: ticket.tier });
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