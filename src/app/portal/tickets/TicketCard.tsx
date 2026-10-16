"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocale, useTranslations } from "next-intl";
import type { MyTicket } from "@/lib/tickets/mine";

const PRIMARY = "#1a2744";

export default function TicketCard({ ticket, past }: { ticket: MyTicket; past?: boolean }) {
  const t = useTranslations("portal.ticketsPage");
  const dateLocale = useLocale() === "zh" ? "zh-TW" : "en-CA";
  const [showQr, setShowQr] = useState(false);

  const when = new Date(ticket.startAt).toLocaleString(dateLocale, {
    timeZone: ticket.timezone,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const usable = ticket.status === "valid" && !past;

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm" style={{ opacity: usable ? 1 : 0.7 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{ticket.eventTitle}</h3>
          <p className="mt-1 text-sm text-gray-600">{when}</p>
          {ticket.location && <p className="text-sm text-gray-600">{ticket.location}</p>}
          <p className="mt-1 text-xs text-gray-500">
            {ticket.tier} · {t("holder", { name: ticket.holderName })}
          </p>
        </div>
        <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs" style={{ borderColor: "#d6d4cc", color: ticket.status === "void" ? "#b42318" : "#52514e" }}>
          {ticket.status === "void"
            ? `✕ ${t("void")}`
            : ticket.checkedInAt
              ? `✓ ${t("checkedIn", { time: new Date(ticket.checkedInAt).toLocaleTimeString(dateLocale, { timeZone: ticket.timezone, hour: "numeric", minute: "2-digit" }) })}`
              : ""}
        </span>
      </div>

      {usable && (
        <div className="mt-4 flex flex-col items-start gap-3">
          <div className="flex flex-wrap gap-2 text-sm">
            <button
              type="button"
              onClick={() => setShowQr((v) => !v)}
              aria-expanded={showQr}
              className="rounded-lg px-3 py-2 font-semibold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              {showQr ? t("hideQr") : t("showQr")}
            </button>
            <a href={`/ticket/${ticket.token}`} className="rounded-lg border px-3 py-2 font-semibold" style={{ borderColor: PRIMARY, color: PRIMARY }}>
              {t("openTicket")}
            </a>
          </div>
          {showQr && (
            <div className="self-center rounded-xl bg-white p-3" style={{ border: "1px solid #e5e7eb" }}>
              {/* Same content as the ticket page's QR: the ticket link, which the door scanner reads. */}
              <QRCodeSVG value={`${window.location.origin}/ticket/${ticket.token}`} size={220} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
