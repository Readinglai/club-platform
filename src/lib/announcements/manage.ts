/**
 * Writing announcements (any VP, the President): list with drafts, create,
 * edit, publish and delete. Members get a push notification the first time
 * an announcement is published.
 */

import { db } from "@/lib/db";
import { can, getAccess } from "@/lib/access/can";
import { sendPushNotification } from "@/lib/webpush";

type Outcome<T = undefined> = { ok: true; value: T } | { ok: false; status: number; message: string };
const fail = (status: number, message: string) => ({ ok: false as const, status, message });
const DENIED = "Only Vice Presidents and the President can manage announcements.";

export async function canManageAnnouncements(userId: string) {
  return can(await getAccess(userId), "announcements.manage");
}

export async function listAllAnnouncements() {
  const rows = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      published: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { name: true } },
      _count: { select: { reads: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    published: r.published,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    authorName: r.author.name ?? "",
    reads: r._count.reads,
  }));
}

export async function getAnnouncementForEditing(id: string) {
  return db.announcement.findUnique({
    where: { id },
    select: { id: true, title: true, content: true, published: true, createdAt: true, updatedAt: true },
  });
}

function clean(raw: { title?: unknown; content?: unknown }) {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (!title) return fail(400, "Please enter a title.");
  if (title.length > 200) return fail(400, "The title is too long (200 characters at most).");
  if (!content) return fail(400, "Please write the announcement.");
  return { ok: true as const, value: { title, content } };
}

async function notifyMembers(announcement: { id: string; title: string }) {
  const subscriptions = await db.pushSubscription.findMany();
  await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPushNotification(sub, {
        title: "新公告 New announcement",
        body: announcement.title,
        url: `/portal/announcements/${announcement.id}`,
        data: { type: "announcement", announcementId: announcement.id },
      })
    )
  );
}

export async function createAnnouncement(
  actorId: string,
  raw: { title?: unknown; content?: unknown; published?: unknown }
): Promise<Outcome<{ id: string }>> {
  if (!(await canManageAnnouncements(actorId))) return fail(403, DENIED);
  const fields = clean(raw);
  if (!fields.ok) return fields;
  const published = raw.published === true;
  const created = await db.announcement.create({ data: { ...fields.value, published, authorId: actorId } });
  if (published) await notifyMembers(created);
  return { ok: true, value: { id: created.id } };
}

export async function updateAnnouncement(
  actorId: string,
  id: string,
  raw: { title?: unknown; content?: unknown; published?: unknown }
): Promise<Outcome> {
  if (!(await canManageAnnouncements(actorId))) return fail(403, DENIED);
  const before = await db.announcement.findUnique({ where: { id }, select: { published: true } });
  if (!before) return fail(404, "Announcement not found.");

  const data: { title?: string; content?: string; published?: boolean } = {};
  if (raw.title !== undefined || raw.content !== undefined) {
    const current = await db.announcement.findUniqueOrThrow({ where: { id }, select: { title: true, content: true } });
    const fields = clean({ title: raw.title ?? current.title, content: raw.content ?? current.content });
    if (!fields.ok) return fields;
    Object.assign(data, fields.value);
  }
  if (raw.published !== undefined) {
    if (typeof raw.published !== "boolean") return fail(400, "published must be true or false.");
    data.published = raw.published;
  }

  const updated = await db.announcement.update({ where: { id }, data });
  // Only going from draft to published notifies, so fixing a typo doesn't.
  if (!before.published && updated.published) await notifyMembers(updated);
  return { ok: true, value: undefined };
}

export async function deleteAnnouncement(actorId: string, id: string): Promise<Outcome> {
  if (!(await canManageAnnouncements(actorId))) return fail(403, DENIED);
  const deleted = await db.announcement.deleteMany({ where: { id } });
  if (deleted.count === 0) return fail(404, "Announcement not found.");
  return { ok: true, value: undefined };
}
