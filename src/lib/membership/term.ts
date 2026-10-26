/**
 * Membership terms run Sep 1 – Aug 31, Toronto time, whatever the join date.
 * Both boundaries fall in daylight time (UTC−4), so midnight is 04:00 UTC.
 */

export type Term = { startYear: number; termStart: Date; termEnd: Date };

export function termStartingIn(startYear: number): Term {
  const termStart = new Date(Date.UTC(startYear, 8, 1, 4)); // Sep 1, 00:00 Toronto
  const nextStart = new Date(Date.UTC(startYear + 1, 8, 1, 4));
  return { startYear, termStart, termEnd: new Date(nextStart.getTime() - 1) }; // Aug 31, 23:59:59.999
}

/** The term a given moment belongs to. */
export function termFor(date: Date = new Date()): Term {
  const year = date.getUTCFullYear();
  const startsThisYear = termStartingIn(year);
  return date >= startsThisYear.termStart ? startsThisYear : termStartingIn(year - 1);
}
