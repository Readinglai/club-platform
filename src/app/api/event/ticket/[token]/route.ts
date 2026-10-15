import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { ticket: null, message: "Ticket not found" },
        { status: 404 }
      );
    }

    // Tickets from the Order/Ticket tables first, then Halloween's EventTicket.
    const entry = await db.ticket.findUnique({
      where: { token },
      include: {
        ticketType: true,
        event: { include: { settings: true } },
        order: { select: { currency: true } },
      },
    });

    if (entry) {
      // A reserved ticket is still waiting for payment, so it isn't a ticket yet.
      if (entry.status === "RESERVED") {
        return NextResponse.json(
          { ticket: null, message: "Ticket not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        ticket: {
          token: entry.token,
          name: entry.holderName,
          email: entry.holderEmail ?? "",
          tier: entry.ticketType.name,
          tierLabel: entry.ticketType.name,
          perks: entry.ticketType.perks,
          price: entry.pricePaid.toFixed(2),
          currency: entry.order.currency,
          status: entry.status === "VALID" ? "valid" : "void",
          event_title: entry.event.title,
          start_at: entry.event.startAt.toISOString(),
          end_at: entry.event.endAt?.toISOString() ?? null,
          location: entry.event.location,
          timezone: entry.event.settings?.timezone ?? "America/Toronto",
        },
      });
    }

    const tickets = await db.$queryRaw<
      Array<{
        token: string;
        name: string;
        email: string;
        tier: string;
        price: string;
        status: string;
        event_title: string;
        start_at: string;
        end_at: string;
        location: string;
      }>
    >`
      SELECT
        et.token,
        et.name,
        et.email,
        et.tier,
        et.price::text AS price,
        et.status,
        e.title AS event_title,
        to_char(e."startAt", 'YYYY-MM-DD"T"HH24:MI:SS') AS start_at,
        to_char(e."endAt", 'YYYY-MM-DD"T"HH24:MI:SS') AS end_at,
        e.location
      FROM "EventTicket" et
      JOIN "Event" e
        ON e.id = et.event_id
      WHERE et.token = ${token}
      LIMIT 1
    `;

    if (tickets.length === 0) {
      return NextResponse.json(
        { ticket: null, message: "Ticket not found" },
        { status: 404 }
      );
    }

    const ticket = tickets[0];

    return NextResponse.json({
      ticket: {
        token: ticket.token,
        name: ticket.name,
        email: ticket.email,
        tier: ticket.tier,
        price: ticket.price,
        status: ticket.status,
        event_title: ticket.event_title,
        start_at: ticket.start_at,
        end_at: ticket.end_at,
        location: ticket.location,
      },
    });
  } catch (error) {
    console.error("Ticket lookup error:", error);

    return NextResponse.json(
      {
        ticket: null,
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}