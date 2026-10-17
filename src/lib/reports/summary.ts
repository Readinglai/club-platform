/**
 * Club-wide totals for the Reports page (any VP, the President): ticket
 * sales and door check-ins per event, and new memberships per month.
 * Totals only, no personal details.
 */

import { db } from "@/lib/db";
import type { MembershipSource } from "@/generated/prisma/client";
import { termStartingIn } from "@/lib/membership/term";
import { DEFAULT_TIME_ZONE } from "@/i18n/time-zone";

export type EventAttendance = {
  eventId: string;
  title: string;
  startAt: string;
  sold: number;
  checkedIn: number;
  /** Whole percent of sold tickets checked in; null when none were sold. */
  rate: number | null;
};

/** Every event with tickets (new tickets and the older Halloween-style ones), newest first. */
export async function eventAttendance(): Promise<EventAttendance[]> {
  const [events, issued, used, legacyIssued, legacyUsed] = await Promise.all([
    db.event.findMany({ orderBy: { startAt: "desc" }, select: { id: true, title: true, startAt: true } }),
    db.ticket.groupBy({ by: ["eventId"], where: { status: "VALID" }, _count: true }),
    db.ticket.groupBy({ by: ["eventId"], where: { status: "VALID", checkedInAt: { not: null } }, _count: true }),
    db.eventTicket.groupBy({ by: ["eventId"], where: { status: "valid" }, _count: true }),
    db.eventTicket.groupBy({ by: ["eventId"], where: { status: "valid", checkedIn: true }, _count: true }),
  ]);
  const count = (rows: Array<{ eventId: string; _count: number }>) => new Map(rows.map((r) => [r.eventId, r._count]));
  const [a, b, c, d] = [count(issued), count(used), count(legacyIssued), count(legacyUsed)];

  return events
    .map((e) => {
      const sold = (a.get(e.id) ?? 0) + (c.get(e.id) ?? 0);
      const checkedIn = (b.get(e.id) ?? 0) + (d.get(e.id) ?? 0);
      return {
        eventId: e.id,
        title: e.title,
        startAt: e.startAt.toISOString(),
        sold,
        checkedIn,
        rate: sold > 0 ? Math.round((checkedIn / sold) * 100) : null,
      };
    })
    .filter((e) => e.sold > 0);
}

export const SOURCES: MembershipSource[] = ["STRIPE", "MANUAL", "COMPLIMENTARY", "IMPORTED"];

export type MonthRow = { month: string; total: number } & Record<MembershipSource, number>;

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const monthKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: DEFAULT_TIME_ZONE, year: "numeric", month: "2-digit" }).format(date);

/** New memberships per month (Sep–Aug) of the school year starting in `startYear`, by source. */
export async function membershipsByMonth(startYear: number) {
  const term = termStartingIn(startYear);
  const rows = await db.membership.findMany({
    where: { termStart: term.termStart, status: { in: ["ACTIVE", "EXPIRED"] } },
    select: { createdAt: true, source: true },
  });

  const empty = () => Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<MembershipSource, number>;
  const months: MonthRow[] = Array.from({ length: 12 }, (_, i) => {
    const month = `${startYear + Math.floor((8 + i) / 12)}-${String(((8 + i) % 12) + 1).padStart(2, "0")}`;
    return { month, total: 0, ...empty() };
  });
  const byKey = new Map(months.map((m) => [m.month, m]));
  const totals = empty();

  for (const r of rows) {
    totals[r.source]++;
    // Memberships recorded before the school year began (e.g. early sign-ups) count in September.
    const row = byKey.get(monthKey(r.createdAt)) ?? (r.createdAt < term.termStart ? months[0] : undefined);
    if (!row) continue;
    row[r.source]++;
    row.total++;
  }
  return { schoolYear: `${startYear}–${String(startYear + 1).slice(2)}`, months, totals, total: rows.length };
}

const esc = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function attendanceCsv(rows: EventAttendance[]) {
  return [
    "event,date,tickets_sold,checked_in,attendance_rate",
    ...rows.map((r) =>
      [r.title, dayKey(new Date(r.startAt)), r.sold, r.checkedIn, r.rate == null ? "" : `${r.rate}%`].map(esc).join(",")
    ),
  ].join("\n");
}

export function membershipsCsv(months: MonthRow[]) {
  return [
    ["month", "total", ...SOURCES.map((s) => s.toLowerCase())].join(","),
    ...months.map((m) => [m.month, m.total, ...SOURCES.map((s) => m[s])].map(esc).join(",")),
  ].join("\n");
}
