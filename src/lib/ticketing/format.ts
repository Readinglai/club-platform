import type { Prisma } from "@/generated/prisma/client";

/** "Free" for zero, otherwise e.g. "CA$25.00". */
export function formatPrice(amount: Prisma.Decimal | number, currency: string): string {
  const value = Number(amount);
  if (value === 0) return "Free";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(value);
}

/** Event time shown in the event's own time zone, e.g. "Fri, Oct 23, 2026, 7:30 PM – 11:30 PM EDT". */
export function formatEventTime(startAt: Date, endAt: Date | null, timezone: string): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });
  const zone = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, timeZoneName: "short" })
    .formatToParts(startAt)
    .find((p) => p.type === "timeZoneName")?.value;

  const start = `${date.format(startAt)}, ${time.format(startAt)}`;
  const end = endAt ? ` – ${time.format(endAt)}` : "";
  return `${start}${end}${zone ? ` ${zone}` : ""}`;
}
