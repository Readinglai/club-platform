/**
 * Managing memberships (Operations VP, President): the member list, one
 * member's details, adding or importing members, and complimentary
 * memberships for staff.
 */

import { db } from "@/lib/db";
import { Prisma, type MembershipSource, type MembershipStatus } from "@/generated/prisma/client";
import { can, getAccess } from "@/lib/access/can";
import { getMyTickets } from "@/lib/tickets/mine";
import { MEMBER_RANGE, MEMBERSHIP_CHECKOUT_MINUTES, STAFF_RANGE } from "./config";
import { nextMemberCode } from "./purchase";
import { termFor, termStartingIn, type Term } from "./term";

type Outcome<T = undefined> = { ok: true; value?: T } | { ok: false; status: number; message: string };
const fail = (status: number, message: string) => ({ ok: false as const, status, message });
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Memberships that count as "already a member" this term: active ones, and
 * checkouts still open at Stripe (older ones can no longer be paid).
 */
function holdsMembership(term: Term): Prisma.MembershipWhereInput {
  const checkoutOpenSince = new Date(Date.now() - MEMBERSHIP_CHECKOUT_MINUTES * 60_000);
  return {
    termStart: term.termStart,
    OR: [{ status: "ACTIVE" }, { status: "PENDING", createdAt: { gte: checkoutOpenSince } }],
  };
}

export async function memberAccess(userId: string) {
  const access = await getAccess(userId);
  return { view: can(access, "members.view"), manage: can(access, "members.manage") };
}

export type MemberFilters = {
  q?: string;
  status?: MembershipStatus | "ALL";
  source?: MembershipSource | "ALL";
  /** Term start year, e.g. 2026 for 2026–27. */
  year?: number;
};

export async function listMemberships(filters: MemberFilters) {
  const term = termStartingIn(filters.year ?? termFor().startYear);
  const q = filters.q?.trim();
  const where: Prisma.MembershipWhereInput = {
    termStart: term.termStart,
    NOT: { memberCode: { startsWith: "PENDING-" } },
    ...(filters.status && filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.source && filters.source !== "ALL" ? { source: filters.source } : {}),
    ...(q
      ? {
          OR: [
            { memberCode: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, counts] = await Promise.all([
    db.membership.findMany({
      where,
      orderBy: { memberCode: "asc" },
      take: 500,
      select: {
        id: true,
        memberCode: true,
        name: true,
        email: true,
        status: true,
        source: true,
        createdAt: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
    }),
    db.membership.groupBy({
      by: ["status"],
      where: { termStart: term.termStart, NOT: { memberCode: { startsWith: "PENDING-" } } },
      _count: true,
    }),
  ]);

  return {
    schoolYear: `${term.startYear}–${String(term.startYear + 1).slice(2)}`,
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) as Partial<Record<MembershipStatus, number>>,
    rows: rows.map((r) => ({
      id: r.id,
      memberCode: r.memberCode,
      name: r.user?.name || r.name || "",
      email: r.user?.email || r.email || "",
      status: r.status,
      source: r.source,
      hasAccount: Boolean(r.userId),
      createdAt: r.createdAt,
    })),
  };
}

/** One membership with its person: profile, all memberships, positions, tickets. */
export async function getMemberDetail(membershipId: string) {
  const membership = await db.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, userId: true, email: true, name: true },
  });
  if (!membership) return null;

  const userId = membership.userId;
  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, createdAt: true, profile: true },
      })
    : null;
  const email = user?.email || membership.email || "";

  const [memberships, positions, tickets] = await Promise.all([
    db.membership.findMany({
      where: userId ? { OR: [{ userId }, ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : [])] } : { email: { equals: email, mode: "insensitive" } },
      orderBy: { termStart: "desc" },
      select: { id: true, memberCode: true, status: true, source: true, termStart: true, termEnd: true, amountPaid: true },
    }),
    userId
      ? db.groupMember.findMany({
          where: { userId, group: { archived: false } },
          select: { position: true, group: { select: { name: true } } },
        })
      : [],
    // Tickets are matched by account or email; with neither there is nothing to show.
    userId || email ? getMyTickets(userId ?? "", email) : [],
  ]);

  return {
    name: user?.name || membership.name || "",
    email: user?.email || membership.email || "",
    hasAccount: Boolean(userId),
    accountSince: user?.createdAt ?? null,
    profile: user?.profile
      ? {
          phone: user.profile.phone,
          studentNumber: user.profile.studentNumber,
          program: user.profile.program,
          yearOfStudy: user.profile.yearOfStudy,
          personalEmail: user.profile.personalEmail,
        }
      : null,
    memberships: memberships.map((m) => ({ ...m, amountPaid: m.amountPaid?.toNumber() ?? null })),
    positions: positions.map((p) => ({ position: p.position, group: p.group.name })),
    tickets,
  };
}

/** Add one member by hand (e.g. paid cash): MANUAL, active for the current term. */
/** `term` defaults to the current school year (tests pass another). */
export async function addMember(
  actorId: string,
  raw: { name?: unknown; email?: unknown },
  term: Term = termFor()
): Promise<Outcome<string>> {
  if (!(await memberAccess(actorId)).manage) return fail(403, "Only the Operations VP or the President can add members.");
  const name = typeof raw.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
  if (!name) return fail(400, "Please enter a name.");
  if (!VALID_EMAIL.test(email)) return fail(400, "Please enter a valid email.");

  const user = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
  const existing = await db.membership.findFirst({
    where: {
      AND: [
        holdsMembership(term),
        { OR: [{ email: { equals: email, mode: "insensitive" } }, ...(user ? [{ userId: user.id }] : [])] },
      ],
    },
    select: { memberCode: true },
  });
  if (existing) return fail(409, `Already a member this year (${existing.memberCode}).`);

  const created = await db.$transaction(async (tx) => {
    const memberCode = await nextMemberCode(tx, term.termStart, MEMBER_RANGE);
    return tx.membership.create({
      data: {
        name,
        email,
        userId: user?.id ?? null,
        memberCode,
        status: "ACTIVE",
        source: "MANUAL",
        termStart: term.termStart,
        termEnd: term.termEnd,
      },
    });
  });
  if (user) await db.user.updateMany({ where: { id: user.id, role: "USER" }, data: { role: "MEMBER" } });
  return { ok: true, value: created.memberCode };
}

/**
 * Import rows of "name,email" (one per line; a header line is skipped).
 * Checking (apply false) marks each row "ready", "invalid", "duplicate" (same
 * email earlier in the list) or "already:<code>"; applying adds the ready ones.
 */
export async function importMembers(actorId: string, csv: string, apply: boolean, term: Term = termFor()) {
  if (!(await memberAccess(actorId)).manage) return { ok: false as const, status: 403, message: "Only the Operations VP or the President can import members." };

  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines[0] && /name/i.test(lines[0]) && /email/i.test(lines[0])) lines.shift();
  const parsed = lines.map((line, i) => {
    const [name = "", email = ""] = line.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
    return { line: i + 1, name, email: email.toLowerCase() };
  });

  const emails = parsed.map((r) => r.email).filter((e) => VALID_EMAIL.test(e));
  const existing = await db.membership.findMany({
    where: {
      AND: [
        holdsMembership(term),
        { OR: [{ email: { in: emails, mode: "insensitive" } }, { user: { email: { in: emails, mode: "insensitive" } } }] },
      ],
    },
    select: { memberCode: true, email: true, user: { select: { email: true } } },
  });
  const codeFor = new Map<string, string>();
  for (const m of existing) for (const e of [m.email, m.user?.email]) if (e) codeFor.set(e.toLowerCase(), m.memberCode);

  const seen = new Set<string>();
  const results: Array<{ line: number; name: string; email: string; result: string }> = [];
  for (const row of parsed) {
    let result: string;
    if (!row.name || !VALID_EMAIL.test(row.email)) result = "invalid";
    else if (seen.has(row.email)) result = "duplicate";
    else if (codeFor.has(row.email)) result = `already:${codeFor.get(row.email)}`;
    else result = "ready";
    seen.add(row.email);

    if (apply && result === "ready") {
      const r = await addMember(actorId, row, term);
      result = r.ok ? `added:${r.value}` : r.message;
    }
    results.push({ ...row, result });
  }
  return { ok: true as const, results };
}

/** Free memberships for everyone with a position who isn't a member this term. */
export async function grantComplimentaryToStaff(
  actorId: string,
  apply: boolean,
  options: { term?: Term; onlyUserIds?: string[] } = {}
) {
  if (!(await memberAccess(actorId)).manage) return { ok: false as const, status: 403, message: "Only the Operations VP or the President can grant memberships." };

  const term = options.term ?? termFor();
  const staff = await db.user.findMany({
    where: {
      groupMemberships: { some: { group: { archived: false } } },
      // Placeholder accounts (…@….invalid) aren't real people; tests name their users instead.
      ...(options.onlyUserIds ? { id: { in: options.onlyUserIds } } : { NOT: { email: { endsWith: ".invalid" } } }),
      memberships: { none: holdsMembership(term) },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (!apply) return { ok: true as const, people: staff.map((s) => ({ name: s.name, email: s.email, code: null as string | null })) };

  const people: Array<{ name: string; email: string; code: string | null }> = [];
  for (const s of staff) {
    const created = await db.$transaction(async (tx) => {
      const memberCode = await nextMemberCode(tx, term.termStart, STAFF_RANGE);
      return tx.membership.create({
        data: {
          userId: s.id,
          name: s.name,
          email: s.email.toLowerCase(),
          memberCode,
          status: "ACTIVE",
          source: "COMPLIMENTARY",
          termStart: term.termStart,
          termEnd: term.termEnd,
          amountPaid: new Prisma.Decimal(0),
        },
      });
    });
    await db.user.updateMany({ where: { id: s.id, role: "USER" }, data: { role: "MEMBER" } });
    people.push({ name: s.name, email: s.email, code: created.memberCode });
  }
  return { ok: true as const, people };
}

/** CSV of the list, as shown. */
export function membersCsv(rows: Awaited<ReturnType<typeof listMemberships>>["rows"]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const header = "member_code,name,email,status,source,has_account";
  return [header, ...rows.map((r) => [r.memberCode, r.name, r.email, r.status, r.source, r.hasAccount ? "yes" : "no"].map(esc).join(","))].join("\n");
}
