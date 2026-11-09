/**
 * Small helpers shared by the order APIs.
 */

import type { MemberInput } from "./orders";

/**
 * The site's own address for Stripe return links and ticket links. Taken from
 * configuration, never from the request's Origin header (which a caller can set).
 */
export function siteOrigin(): string {
  // A Vercel preview (test) deployment links back to itself, on its stable
  // branch address, so Stripe returns buyers and ticket emails point there.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** `member: { code, cardName }` from an order request body, if both were filled in. */
export function memberFromBody(body: Record<string, unknown>): MemberInput | null {
  const m = body.member;
  if (!m || typeof m !== "object") return null;
  const { code, cardName } = m as Record<string, unknown>;
  if (typeof code !== "string" || typeof cardName !== "string") return null;
  if (!code.trim() && !cardName.trim()) return null;
  return { code, cardName };
}

/**
 * Best-effort limit on wrong member-ID guesses, per visitor IP. It lives in
 * the memory of one server instance, so it slows guessing down rather than
 * making it impossible; the member check itself never says which part was wrong.
 */
const FAILURE_WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export function tooManyMemberFailures(ip: string): boolean {
  const entry = failures.get(ip);
  return Boolean(entry && entry.resetAt > Date.now() && entry.count >= MAX_FAILURES);
}

export function recordMemberFailure(ip: string) {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || entry.resetAt <= now) {
    failures.set(ip, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
  } else {
    entry.count += 1;
  }
  // Keep the map small on a long-lived instance.
  if (failures.size > 5000) {
    for (const [key, value] of failures) if (value.resetAt <= now) failures.delete(key);
  }
}
