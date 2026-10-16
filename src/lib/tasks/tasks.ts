/**
 * Tasks, discussions and votes that belong to a department or group.
 * (The old TaskGroup tables are no longer used for new work.)
 */

import { db } from "@/lib/db";
import type { TaskStatus } from "@/generated/prisma/client";
import { zonedInputToDate } from "@/lib/events/time";
import { groupRights, isStaff } from "./access";

type Outcome<T = undefined> = { ok: true; value?: T } | { ok: false; status: number; message: string };
const fail = (status: number, message: string) => ({ ok: false as const, status, message });

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  dueAt: true,
  groupId: true,
  group: { select: { name: true } },
  assignees: { select: { user: { select: { id: true, name: true, email: true } } } },
  createdAt: true,
} as const;

function parseDue(v: unknown) {
  const s = text(v);
  if (!s) return null;
  // Due dates are whole days: 11:59 PM Toronto time on that day.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return zonedInputToDate(`${s}T23:59`, "America/Toronto") ?? undefined;
}

async function validAssignees(raw: unknown): Promise<string[] | null> {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.some((x) => typeof x !== "string")) return null;
  const ids = [...new Set(raw as string[])];
  for (const id of ids) if (!(await isStaff(id))) return null;
  return ids;
}

/** A group's view: its tasks, discussion and votes, plus the viewer's rights. */
export async function getGroupBoard(userId: string, groupId: string) {
  const rights = await groupRights(userId, groupId);
  if (!rights.work) return null;

  const [group, tasks, discussion, votes] = await Promise.all([
    db.group.findUnique({ where: { id: groupId }, select: { id: true, name: true, archived: true } }),
    db.task.findMany({ where: { groupId }, orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }], select: taskSelect }),
    db.discussion.findUnique({
      where: { groupId },
      select: {
        comments: {
          orderBy: { createdAt: "asc" },
          select: { id: true, content: true, createdAt: true, isAnonymous: true, authorId: true, author: { select: { name: true } } },
        },
      },
    }),
    db.vote.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        closedAt: true,
        createdById: true,
        createdBy: { select: { name: true } },
        options: { select: { id: true, label: true, responses: { select: { userId: true } } } },
      },
    }),
  ]);
  if (!group) return null;

  return {
    group: { id: group.id, name: group.name, archived: group.archived },
    rights,
    tasks,
    comments: (discussion?.comments ?? []).map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: c.isAnonymous ? null : c.author?.name ?? null,
      mine: c.authorId === userId,
    })),
    votes: votes.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      closed: v.closedAt !== null,
      createdBy: v.createdBy.name,
      mine: v.createdById === userId,
      options: v.options.map((o) => ({ id: o.id, label: o.label, count: o.responses.length, chosen: o.responses.some((r) => r.userId === userId) })),
    })),
  };
}

/** Tasks assigned to this person, across every group. */
export async function getMyTasks(userId: string) {
  return db.task.findMany({
    where: { groupId: { not: null }, assignees: { some: { userId } } },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "asc" }],
    select: taskSelect,
  });
}

export async function createTask(actorId: string, groupId: string, raw: Record<string, unknown>): Promise<Outcome<string>> {
  if (!(await groupRights(actorId, groupId)).work) return fail(403, "You're not in this group.");
  const title = text(raw.title);
  if (!title) return fail(400, "Please give the task a title.");
  const dueAt = parseDue(raw.dueAt);
  if (dueAt === undefined) return fail(400, "The due date isn't valid.");
  const assignees = await validAssignees(raw.assigneeIds);
  if (!assignees) return fail(400, "Tasks can only be assigned to staff.");

  const task = await db.task.create({
    data: {
      title,
      description: text(raw.description) || null,
      groupId,
      dueAt,
      assignees: { create: assignees.map((userId) => ({ userId })) },
    },
  });
  return { ok: true, value: task.id };
}

async function taskAccess(actorId: string, taskId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { groupId: true, assignees: { select: { userId: true } } },
  });
  if (!task?.groupId) return null;
  const rights = await groupRights(actorId, task.groupId);
  const assigned = task.assignees.some((a) => a.userId === actorId);
  return { rights, assigned };
}

export async function updateTask(actorId: string, taskId: string, raw: Record<string, unknown>): Promise<Outcome> {
  const a = await taskAccess(actorId, taskId);
  if (!a) return fail(404, "Task not found.");
  if (!a.rights.work && !a.assigned) return fail(403, "You can't change this task.");

  const data: Record<string, unknown> = {};
  if (raw.status !== undefined) {
    if (!STATUSES.includes(raw.status as TaskStatus)) return fail(400, "Unknown status.");
    data.status = raw.status;
  }
  // Only people in the group change the task itself; assignees only move its status.
  if (a.rights.work) {
    if (raw.title !== undefined) {
      const title = text(raw.title);
      if (!title) return fail(400, "Please give the task a title.");
      data.title = title;
    }
    if (raw.description !== undefined) data.description = text(raw.description) || null;
    if (raw.dueAt !== undefined) {
      const dueAt = parseDue(raw.dueAt);
      if (dueAt === undefined) return fail(400, "The due date isn't valid.");
      data.dueAt = dueAt;
    }
  }
  const assignees = a.rights.work && raw.assigneeIds !== undefined ? await validAssignees(raw.assigneeIds) : undefined;
  if (assignees === null) return fail(400, "Tasks can only be assigned to staff.");

  await db.$transaction(async (tx) => {
    if (Object.keys(data).length) await tx.task.update({ where: { id: taskId }, data });
    if (assignees) {
      await tx.taskAssignee.deleteMany({ where: { taskId, userId: { notIn: assignees } } });
      for (const userId of assignees) {
        await tx.taskAssignee.upsert({
          where: { taskId_userId: { taskId, userId } },
          create: { taskId, userId },
          update: {},
        });
      }
    }
  });
  return { ok: true };
}

export async function deleteTask(actorId: string, taskId: string): Promise<Outcome> {
  const a = await taskAccess(actorId, taskId);
  if (!a) return fail(404, "Task not found.");
  if (!a.rights.manage) return fail(403, "Only the group's VP or the President can delete tasks.");
  await db.task.delete({ where: { id: taskId } });
  return { ok: true };
}

export async function addComment(actorId: string, groupId: string, raw: Record<string, unknown>): Promise<Outcome> {
  if (!(await groupRights(actorId, groupId)).work) return fail(403, "You're not in this group.");
  const content = text(raw.content);
  if (!content) return fail(400, "Write something first.");
  const discussion = await db.discussion.upsert({ where: { groupId }, create: { groupId }, update: {} });
  await db.comment.create({ data: { discussionId: discussion.id, authorId: actorId, content, isAnonymous: raw.anonymous === true } });
  return { ok: true };
}

export async function deleteComment(actorId: string, commentId: string): Promise<Outcome> {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, discussion: { select: { groupId: true } } },
  });
  if (!comment?.discussion.groupId) return fail(404, "Comment not found.");
  const own = comment.authorId === actorId;
  if (!own && !(await groupRights(actorId, comment.discussion.groupId)).manage) return fail(403, "You can only remove your own comments.");
  await db.comment.delete({ where: { id: commentId } });
  return { ok: true };
}

export async function createVote(actorId: string, groupId: string, raw: Record<string, unknown>): Promise<Outcome> {
  if (!(await groupRights(actorId, groupId)).work) return fail(403, "You're not in this group.");
  const title = text(raw.title);
  const options = Array.isArray(raw.options) ? [...new Set(raw.options.map(text).filter(Boolean))] : [];
  if (!title) return fail(400, "Please write the question.");
  if (options.length < 2) return fail(400, "Give at least two options.");
  await db.vote.create({
    data: {
      title,
      description: text(raw.description) || null,
      groupId,
      createdById: actorId,
      options: { create: options.map((label) => ({ label })) },
    },
  });
  return { ok: true };
}

/** One choice per person: answering again replaces the earlier answer. */
export async function respondToVote(actorId: string, voteId: string, optionId: string): Promise<Outcome> {
  const vote = await db.vote.findUnique({ where: { id: voteId }, select: { groupId: true, closedAt: true, options: { select: { id: true } } } });
  if (!vote?.groupId) return fail(404, "Vote not found.");
  if (vote.closedAt) return fail(409, "This vote is closed.");
  if (!(await groupRights(actorId, vote.groupId)).work) return fail(403, "You're not in this group.");
  if (!vote.options.some((o) => o.id === optionId)) return fail(400, "Unknown option.");

  await db.$transaction([
    db.voteResponse.deleteMany({ where: { userId: actorId, voteOption: { voteId } } }),
    db.voteResponse.create({ data: { userId: actorId, voteOptionId: optionId } }),
  ]);
  return { ok: true };
}

export async function closeVote(actorId: string, voteId: string): Promise<Outcome> {
  const vote = await db.vote.findUnique({ where: { id: voteId }, select: { groupId: true, createdById: true, closedAt: true } });
  if (!vote?.groupId) return fail(404, "Vote not found.");
  const mine = vote.createdById === actorId;
  if (!mine && !(await groupRights(actorId, vote.groupId)).manage) return fail(403, "Only whoever started the vote, or the group's VP, can close it.");
  if (vote.closedAt) return { ok: true };
  await db.vote.update({ where: { id: voteId }, data: { closedAt: new Date() } });
  return { ok: true };
}

/** Staff search for the assignee picker. */
export async function searchStaff(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return db.user.findMany({
    where: {
      groupMemberships: { some: { group: { archived: false } } },
      OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }],
    },
    take: 8,
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}
