"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const PRIMARY = "#1a2744";

type Ticket = {
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
};

export default function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const { token } = await params;

        const response = await fetch(
          `/api/event/ticket/${encodeURIComponent(token)}`
        );

        if (!response.ok) {
          setNotFound(true);
          return;
        }

        const data = await response.json();

        if (!data.ticket) {
          setNotFound(true);
          return;
        }

        setTicket(data.ticket);
      } catch (error) {
        console.error("Ticket loading error:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [params]);

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#f9f7f4" }}
      >
        <p className="text-sm" style={{ color: PRIMARY }}>
          Loading ticket...
        </p>
      </main>
    );
  }

  if (notFound || !ticket) {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#f9f7f4" }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="rounded-2xl bg-white p-8 shadow-sm"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <div className="text-4xl mb-4">🎃</div>

            <h1
              className="text-xl font-bold"
              style={{ color: PRIMARY }}
            >
              Ticket not found
            </h1>

            <p className="text-sm text-gray-500 mt-2">
              We could not find a ticket associated with this link.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isVoid = ticket.status === "void";

  const ticketUrl =
    typeof window !== "undefined" ? window.location.href : "";

  const eventDate = new Date(ticket.start_at).toLocaleDateString(
    "en-CA",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  const eventStart = new Date(ticket.start_at).toLocaleTimeString(
    "en-CA",
    {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Toronto",
    }
  );
  
  const eventEnd = new Date(ticket.end_at).toLocaleTimeString(
    "en-CA",
    {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Toronto",
    }
  );

  const tierName =
    ticket.tier === "UNLIMITED" ? "Unlimited" : "Regular";

  return (
    <main
      className="min-h-screen px-4 py-8 sm:py-12"
      style={{ backgroundColor: "#f9f7f4" }}
    >
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <p
            className="text-xs uppercase tracking-widest mb-2"
            style={{ color: "#9ca3af" }}
          >
            ROCSAUT Events
          </p>

          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: PRIMARY }}
          >
            2026 ROCSAUT
            <br />
            Halloween Party
          </h1>
        </div>

        <div
          className="rounded-3xl bg-white shadow-sm overflow-hidden"
          style={{ border: "1px solid #e5e7eb" }}
        >
          <div
            className="px-6 py-4 text-center"
            style={{
              backgroundColor: isVoid ? "#f3f4f6" : "#ecfdf5",
              color: isVoid ? "#6b7280" : "#15803d",
            }}
          >
            <p className="text-sm font-bold uppercase tracking-wide">
              {isVoid ? "TICKET VOID" : "VALID TICKET"}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex justify-center mb-7">
              <div
                className="p-4 bg-white rounded-2xl"
                style={{ border: "1px solid #e5e7eb" }}
              >
                {ticketUrl && !isVoid ? (
                  <QRCodeSVG
                    value={ticketUrl}
                    size={220}
                    level="M"
                    includeMargin
                  />
                ) : (
                  <div
                    className="w-[220px] h-[220px] flex items-center justify-center text-center"
                    style={{
                      backgroundColor: "#f3f4f6",
                      color: "#9ca3af",
                    }}
                  >
                    Ticket unavailable
                  </div>
                )}
              </div>
            </div>

            <div className="text-center mb-7">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Ticket Holder
              </p>

              <h2
                className="text-2xl font-bold mt-1"
                style={{ color: PRIMARY }}
              >
                {ticket.name}
              </h2>
            </div>

            <div
              className="rounded-2xl p-5 mb-6"
              style={{
                backgroundColor:
                  ticket.tier === "UNLIMITED"
                    ? "#fff7ed"
                    : "#f0fdf4",
              }}
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Ticket Type
              </p>

              <p
                className="text-xl font-bold mt-1"
                style={{ color: PRIMARY }}
              >
                {tierName}
              </p>

              <p className="text-sm text-gray-500 mt-1">
                {ticket.tier === "UNLIMITED"
                  ? "Unlimited alcohol + cocktails + 1 photobooth photo"
                  : "2 drink tickets"}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Date
                </p>

                <p
                  className="text-sm font-medium mt-1"
                  style={{ color: PRIMARY }}
                >
                  {eventDate}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Time
                </p>

                <p
                  className="text-sm font-medium mt-1"
                  style={{ color: PRIMARY }}
                >
                  {eventStart} – {eventEnd}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">
                  Location
                </p>

                <p
                  className="text-sm font-medium mt-1"
                  style={{ color: PRIMARY }}
                >
                  {ticket.location}
                </p>
              </div>
            </div>

            {!isVoid && (
              <div
                className="mt-7 pt-6"
                style={{
                  borderTop: "1px solid #f3f4f6",
                }}
              >
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  Please show this QR code to ROCSAUT staff when
                  entering the event.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Please keep this page accessible on your phone.
        </p>
      </div>
    </main>
  );
}