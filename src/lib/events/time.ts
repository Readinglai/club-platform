/**
 * Converting between an event's local wall-clock time ("2026-10-23T19:30" in
 * Asia/Taipei) and the exact moment stored in the database. Uses Intl only.
 */

/** Minutes the zone is ahead of UTC at that moment (e.g. Toronto in summer: -240). */
function offsetMinutes(at: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-10-23T19:30" in the given zone → the exact moment. Null if malformed. */
export function zonedInputToDate(local: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes settle the offset around daylight-saving changes.
  let result = guess - offsetMinutes(new Date(guess), timeZone) * 60000;
  result = guess - offsetMinutes(new Date(result), timeZone) * 60000;
  return new Date(result);
}

/** The exact moment → "2026-10-23T19:30" in the given zone, for date-time inputs. */
export function dateToZonedInput(date: Date, timeZone: string): string {
  const local = new Date(date.getTime() + offsetMinutes(date, timeZone) * 60000);
  return local.toISOString().slice(0, 16);
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Zones offered in the event form; anything valid can still be stored. */
export const COMMON_TIME_ZONES = ["America/Toronto", "Asia/Taipei", "America/Vancouver", "Asia/Hong_Kong", "Europe/London"];
