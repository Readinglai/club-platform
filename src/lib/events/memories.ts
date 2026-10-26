/**
 * An event's "past memories" on its public detail page: a short recap
 * (EventSettings.memoriesRecap) and photos with captions (EventMemoryPhoto).
 * Added in the portal by the Events VP and the Website group (memories.manage).
 */

import { db } from "@/lib/db";
import { can, getAccess } from "@/lib/access/can";

const LIMITS = { photos: 30, caption: 200, recap: 2000 };

export async function canManageMemories(userId: string) {
  return can(await getAccess(userId), "memories.manage");
}

export async function getEventMemories(eventId: string) {
  const [settings, photos] = await Promise.all([
    db.eventSettings.findUnique({ where: { eventId }, select: { memoriesRecap: true } }),
    db.eventMemoryPhoto.findMany({ where: { eventId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, imageUrl: true, caption: true } }),
  ]);
  return { recap: settings?.memoriesRecap ?? null, photos };
}

/** Events to add memories to: published, most recent first. */
export async function listEventsForMemories() {
  const events = await db.event.findMany({
    where: { published: true },
    orderBy: { startAt: "desc" },
    select: { id: true, title: true, startAt: true, settings: { select: { memoriesRecap: true } }, _count: { select: { memoryPhotos: true } } },
  });
  return events.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, hasRecap: Boolean(e.settings?.memoriesRecap), photos: e._count.memoryPhotos }));
}

type Outcome = { ok: true } | { ok: false; status: number; message: string };

/**
 * Save the recap and the photo list as shown on the editor: photos missing
 * from the list are removed, the rest keep the list's order.
 */
export async function saveEventMemories(actorId: string, eventId: string, raw: { recap?: unknown; photos?: unknown }): Promise<Outcome> {
  if (!(await canManageMemories(actorId))) return { ok: false, status: 403, message: "Only the Events VP and the Website group can edit event memories." };
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return { ok: false, status: 404, message: "Event not found." };

  const recap = typeof raw.recap === "string" ? raw.recap.trim() : "";
  if (recap.length > LIMITS.recap) return { ok: false, status: 400, message: `The recap can be ${LIMITS.recap} characters at most.` };
  const list = Array.isArray(raw.photos) ? raw.photos : [];
  if (list.length > LIMITS.photos) return { ok: false, status: 400, message: `Up to ${LIMITS.photos} photos per event.` };

  const photos: Array<{ id: string | null; imageUrl: string; caption: string | null }> = [];
  for (const item of list) {
    const p = (item ?? {}) as Record<string, unknown>;
    const imageUrl = typeof p.imageUrl === "string" ? p.imageUrl.trim() : "";
    if (!/^https:\/\//.test(imageUrl)) return { ok: false, status: 400, message: "Each photo needs an uploaded image." };
    const caption = typeof p.caption === "string" ? p.caption.trim() : "";
    if (caption.length > LIMITS.caption) return { ok: false, status: 400, message: `Captions can be ${LIMITS.caption} characters at most.` };
    photos.push({ id: typeof p.id === "string" ? p.id : null, imageUrl, caption: caption || null });
  }

  const existing = new Set((await db.eventMemoryPhoto.findMany({ where: { eventId }, select: { id: true } })).map((p) => p.id));
  const keep = photos.filter((p) => p.id && existing.has(p.id)).map((p) => p.id!);

  await db.$transaction([
    db.eventSettings.upsert({ where: { eventId }, create: { eventId, memoriesRecap: recap || null }, update: { memoriesRecap: recap || null } }),
    db.eventMemoryPhoto.deleteMany({ where: { eventId, id: { notIn: keep } } }),
    ...photos.map((p, i) =>
      p.id && existing.has(p.id)
        ? db.eventMemoryPhoto.update({ where: { id: p.id }, data: { caption: p.caption, sortOrder: i } })
        : db.eventMemoryPhoto.create({ data: { eventId, imageUrl: p.imageUrl, caption: p.caption, sortOrder: i, createdById: actorId } })
    ),
  ]);
  return { ok: true };
}
