/**
 * Creating and editing events and their ticket tiers.
 *
 * - Create: events.create (Events VP, President). Every new event gets its
 *   EventSettings and its own team group under Events.
 * - Edit details, modules, publishing and tiers: events.manage on the event's
 *   team (Events VP, President). Event team staff can't change these.
 * Tiers are never deleted once used; they're switched off (active = false).
 */

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { can, getAccess } from "@/lib/access/can";
import { eventGroupSlug, GROUP_SLUGS } from "@/lib/access/groups";
import { isValidTimeZone, zonedInputToDate } from "./time";

type Outcome<T = undefined> = { ok: true; value?: T } | { ok: false; status: number; message: string };
const fail = (status: number, message: string) => ({ ok: false as const, status, message });

const MODULES = ["ticketsEnabled", "checkInEnabled", "budgetEnabled", "dashboardEnabled"] as const;
type ModuleKey = (typeof MODULES)[number];

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const optionalText = (v: unknown) => text(v) || null;
const money = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
};
const wholeNumber = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

export async function canManageEvent(userId: string, eventId: string) {
  const group = await db.group.findUnique({ where: { eventId }, select: { id: true } });
  const access = await getAccess(userId);
  if (group) return can(access, "events.manage", { groupId: group.id });
  return access.globalGrants.has("*") || access.globalGrants.has("events.manage");
}

/** Shared validation for event details; times are local to the event's zone. */
function parseDetails(raw: Record<string, unknown>) {
  const title = text(raw.title).replace(/\s+/g, " ");
  if (!title) return fail(400, "Please enter a title.");

  const timezone = text(raw.timezone) || "America/Toronto";
  if (!isValidTimeZone(timezone)) return fail(400, "Unknown time zone.");

  const startAt = zonedInputToDate(text(raw.startAt), timezone);
  if (!startAt) return fail(400, "Please enter the start date and time.");
  const endAt = text(raw.endAt) ? zonedInputToDate(text(raw.endAt), timezone) : null;
  if (text(raw.endAt) && !endAt) return fail(400, "The end time isn't valid.");
  if (endAt && endAt <= startAt) return fail(400, "The end must be after the start.");

  const imageUrl = optionalText(raw.imageUrl);
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return fail(400, "The image link must start with http(s)://");

  const modules = Object.fromEntries(MODULES.map((m) => [m, raw[m] === true])) as Record<ModuleKey, boolean>;

  return {
    ok: true as const,
    event: {
      title,
      description: optionalText(raw.description),
      location: optionalText(raw.location),
      imageUrl,
      startAt,
      endAt,
    },
    settings: { timezone, ...modules },
  };
}

export async function createEvent(actorId: string, raw: Record<string, unknown>): Promise<Outcome<string>> {
  if (!can(await getAccess(actorId), "events.create")) return fail(403, "Only the Events VP or President can create events.");

  const parsed = parseDetails(raw);
  if (!parsed.ok) return parsed;

  const eventsDept = await db.group.findUnique({ where: { slug: GROUP_SLUGS.events }, select: { id: true } });
  if (!eventsDept) return fail(500, "The Events department is missing; run scripts/setup-groups.ts.");

  const eventId = await db.$transaction(async (tx) => {
    const event = await tx.event.create({ data: { ...parsed.event, published: false } });
    await tx.eventSettings.create({ data: { eventId: event.id, ...parsed.settings } });
    await tx.group.create({
      data: { slug: eventGroupSlug(event.id), name: parsed.event.title, parentId: eventsDept.id, eventId: event.id },
    });
    return event.id;
  });
  return { ok: true, value: eventId };
}

export async function updateEvent(actorId: string, eventId: string, raw: Record<string, unknown>): Promise<Outcome> {
  if (!(await canManageEvent(actorId, eventId))) return fail(403, "You can't edit this event.");
  const parsed = parseDetails(raw);
  if (!parsed.ok) return parsed;

  await db.$transaction([
    db.event.update({ where: { id: eventId }, data: parsed.event }),
    db.eventSettings.upsert({
      where: { eventId },
      create: { eventId, ...parsed.settings },
      update: parsed.settings,
    }),
    db.group.updateMany({ where: { eventId }, data: { name: parsed.event.title } }),
  ]);
  return { ok: true };
}

export async function setPublished(actorId: string, eventId: string, published: boolean): Promise<Outcome> {
  if (!(await canManageEvent(actorId, eventId))) return fail(403, "You can't edit this event.");
  await db.event.update({ where: { id: eventId }, data: { published } });
  return { ok: true };
}

function parseTicketType(raw: Record<string, unknown>) {
  const name = text(raw.name);
  if (!name) return fail(400, "Please name the tier.");
  const price = money(raw.price);
  if (price === null || Number.isNaN(price)) return fail(400, "Enter a price (0 for free).");
  const memberPrice = money(raw.memberPrice);
  if (Number.isNaN(memberPrice)) return fail(400, "The member price isn't valid.");
  const capacity = wholeNumber(raw.capacity);
  if (Number.isNaN(capacity)) return fail(400, "Capacity must be a whole number (or empty for unlimited).");
  const sortOrder = wholeNumber(raw.sortOrder);

  return {
    ok: true as const,
    data: {
      name,
      description: optionalText(raw.description),
      price: new Prisma.Decimal(price),
      memberPrice: memberPrice === null ? null : new Prisma.Decimal(memberPrice),
      capacity,
      membersOnly: raw.membersOnly === true,
      color: optionalText(raw.color),
      perks: optionalText(raw.perks),
      sortOrder: sortOrder === null || Number.isNaN(sortOrder) ? 0 : sortOrder,
      active: raw.active !== false,
    },
  };
}

/** Sales window, entered in the event's local time. */
async function salesWindow(eventId: string, raw: Record<string, unknown>) {
  const settings = await db.eventSettings.findUnique({ where: { eventId }, select: { timezone: true } });
  const tz = settings?.timezone ?? "America/Toronto";
  const salesStartAt = text(raw.salesStartAt) ? zonedInputToDate(text(raw.salesStartAt), tz) : null;
  const salesEndAt = text(raw.salesEndAt) ? zonedInputToDate(text(raw.salesEndAt), tz) : null;
  if (salesStartAt && salesEndAt && salesEndAt <= salesStartAt) return null;
  return { salesStartAt, salesEndAt };
}

export async function createTicketType(actorId: string, eventId: string, raw: Record<string, unknown>): Promise<Outcome> {
  if (!(await canManageEvent(actorId, eventId))) return fail(403, "You can't edit this event.");
  const parsed = parseTicketType(raw);
  if (!parsed.ok) return parsed;
  const window = await salesWindow(eventId, raw);
  if (!window) return fail(400, "Sales must end after they start.");

  await db.ticketType.create({ data: { eventId, ...parsed.data, ...window } });
  return { ok: true };
}

export async function updateTicketType(actorId: string, eventId: string, typeId: string, raw: Record<string, unknown>): Promise<Outcome> {
  if (!(await canManageEvent(actorId, eventId))) return fail(403, "You can't edit this event.");
  const parsed = parseTicketType(raw);
  if (!parsed.ok) return parsed;
  const window = await salesWindow(eventId, raw);
  if (!window) return fail(400, "Sales must end after they start.");

  // Capacity can't drop below what's already sold.
  if (parsed.data.capacity !== null) {
    const sold = await db.ticket.count({ where: { ticketTypeId: typeId, status: { in: ["VALID", "RESERVED"] } } });
    if (parsed.data.capacity < sold) return fail(400, `${sold} ticket(s) are already sold or held; capacity can't be lower.`);
  }

  const { count } = await db.ticketType.updateMany({ where: { id: typeId, eventId }, data: { ...parsed.data, ...window } });
  return count ? { ok: true } : fail(404, "Tier not found.");
}
