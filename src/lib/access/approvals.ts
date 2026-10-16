/**
 * Second-person approval for destructive actions.
 *
 * Which actions need approval, and who approves, is the APPROVAL_RULES list
 * below (data, so it can move to the admin portal later). Today only
 * "event.delete" is listed.
 *
 *   requestApproval → ApprovalRequest PENDING (with a snapshot of what's affected)
 *   decideApproval  → APPROVED (the action runs) or REJECTED
 *
 * Nobody can decide their own request.
 */

import { db } from "@/lib/db";
import { Prisma, type GroupPosition } from "@/generated/prisma/client";
import { can, getAccess, type Access } from "./can";
import { GROUP_SLUGS } from "./groups";
import type { Permission } from "./rules";

/** Halloween 2026 runs on the frozen ticket tables and must never be deleted here. */
const PROTECTED_EVENT_IDS = new Set(["00b84455-309c-4dba-9722-b031f9042081"]);

type ApprovalRule = {
  /** Permission needed to ask for the action. */
  requestPermission: Permission;
  /** Who decides a normal request. */
  approver: { group: string; position: GroupPosition };
  /** Who decides when the President asks (they can't approve themselves). */
  approverWhenPresidentAsks: { group: string; position: GroupPosition };
};

export const APPROVAL_RULES: Record<string, ApprovalRule> = {
  "event.delete": {
    requestPermission: "events.manage",
    approver: { group: GROUP_SLUGS.executive, position: "PRESIDENT" },
    approverWhenPresidentAsks: { group: GROUP_SLUGS.events, position: "VP" },
  },
};

export type ApprovalAction = keyof typeof APPROVAL_RULES;

type Outcome = { ok: true; id?: string } | { ok: false; status: number; message: string };

async function holds(userId: string, slug: string, position: GroupPosition) {
  const count = await db.groupMember.count({
    where: { userId, position, group: { slug, archived: false } },
  });
  return count > 0;
}

/** What deleting this event would affect; refuses if anything would be lost. */
async function eventDeletionCheck(eventId: string) {
  if (PROTECTED_EVENT_IDS.has(eventId)) {
    return { ok: false as const, message: "This event is protected and can't be deleted." };
  }
  const event = await db.event.findUnique({ where: { id: eventId }, select: { id: true, title: true, startAt: true } });
  if (!event) return { ok: false as const, message: "Event not found." };

  const [tickets, orders, legacyTickets, registrations, financeRecords, budgetLines] = await Promise.all([
    db.ticket.count({ where: { eventId } }),
    db.order.count({ where: { eventId } }),
    db.eventTicket.count({ where: { eventId } }),
    db.registration.count({ where: { eventId } }),
    db.financeRecord.count({ where: { eventId } }),
    db.eventBudgetLine.count({ where: { eventId } }),
  ]);
  const snapshot = {
    title: event.title,
    startAt: event.startAt.toISOString(),
    tickets,
    orders,
    legacyTickets,
    registrations,
    financeRecords,
    budgetLines,
  };

  if (tickets + orders + legacyTickets + registrations > 0) {
    return {
      ok: false as const,
      message: "This event has tickets, orders or registrations, so it can't be deleted.",
      snapshot,
    };
  }
  if (financeRecords + budgetLines > 0) {
    return {
      ok: false as const,
      message: "This event has a budget or finance records, so it can't be deleted.",
      snapshot,
    };
  }
  return { ok: true as const, snapshot };
}

export async function requestApproval(input: {
  userId: string;
  action: ApprovalAction;
  targetId: string;
  access?: Access;
}): Promise<Outcome> {
  const rule = APPROVAL_RULES[input.action];
  if (!rule) return { ok: false, status: 400, message: "Unknown action." };

  const access = input.access ?? (await getAccess(input.userId));
  if (!can(access, rule.requestPermission)) {
    return { ok: false, status: 403, message: "You don't have permission to request this." };
  }

  const existing = await db.approvalRequest.findFirst({
    where: { action: input.action, targetId: input.targetId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) return { ok: false, status: 409, message: "A request for this is already waiting for approval." };

  const check = await eventDeletionCheck(input.targetId);
  if (!check.ok) return { ok: false, status: 400, message: check.message };

  const presidentAsks = await holds(input.userId, GROUP_SLUGS.executive, "PRESIDENT");
  const approver = presidentAsks ? rule.approverWhenPresidentAsks : rule.approver;

  const request = await db.approvalRequest.create({
    data: {
      action: input.action,
      targetId: input.targetId,
      details: { ...check.snapshot, approverGroup: approver.group } as Prisma.InputJsonValue,
      requestedById: input.userId,
      approverPosition: approver.position,
    },
  });
  return { ok: true, id: request.id };
}

/** Can this person decide this request? */
export async function canDecide(userId: string, request: { requestedById: string; approverPosition: GroupPosition; details: Prisma.JsonValue }) {
  if (request.requestedById === userId) return false;
  const group = (request.details as { approverGroup?: string } | null)?.approverGroup;
  if (!group) return false;
  return holds(userId, group, request.approverPosition);
}

export async function decideApproval(input: {
  userId: string;
  requestId: string;
  decision: "APPROVED" | "REJECTED";
  note?: string;
}): Promise<Outcome> {
  const request = await db.approvalRequest.findUnique({ where: { id: input.requestId } });
  if (!request || request.status !== "PENDING") {
    return { ok: false, status: 404, message: "No pending request found." };
  }
  if (!(await canDecide(input.userId, request))) {
    return { ok: false, status: 403, message: "You can't decide this request." };
  }

  if (input.decision === "APPROVED" && request.action === "event.delete") {
    // Re-check at the moment of deletion: tickets may have been sold since.
    const check = await eventDeletionCheck(request.targetId);
    if (!check.ok) return { ok: false, status: 409, message: check.message };
  }

  const decided = await db.$transaction(async (tx) => {
    const { count } = await tx.approvalRequest.updateMany({
      where: { id: request.id, status: "PENDING" },
      data: {
        status: input.decision,
        decidedById: input.userId,
        decidedAt: new Date(),
        note: input.note?.trim() || null,
      },
    });
    if (count === 0) return false;

    if (input.decision === "APPROVED" && request.action === "event.delete") {
      await tx.eventSettings.deleteMany({ where: { eventId: request.targetId } });
      await tx.group.updateMany({ where: { eventId: request.targetId }, data: { eventId: null, archived: true } });
      await tx.ticketType.deleteMany({ where: { eventId: request.targetId } });
      await tx.event.delete({ where: { id: request.targetId } });
    }
    return true;
  });

  if (!decided) return { ok: false, status: 409, message: "This request was already decided." };
  return { ok: true };
}
