/**
 * What the portal home highlights for a person: only things that need them.
 */

import { db } from "@/lib/db";
import { canDecide } from "@/lib/access/approvals";
import { getCurrentMembership } from "@/lib/membership/purchase";
import { getMyTickets, type MyTicket } from "@/lib/tickets/mine";

const RENEW_WINDOW_DAYS = 30;

export type Attention = {
  approvalsWaiting: number;
  openTasks: number;
  nextTicket: MyTicket | null;
  membership: { state: "none" } | { state: "active"; code: string; endsSoon: boolean; termEnd: string };
  unreadAnnouncements: number;
};

export async function getAttention(userId: string, email: string): Promise<Attention> {
  const [pendingApprovals, membership, tickets, unreadAnnouncements, openTasks] = await Promise.all([
    db.approvalRequest.findMany({
      where: { status: "PENDING" },
      select: { requestedById: true, approverPosition: true, details: true },
    }),
    getCurrentMembership(userId),
    getMyTickets(userId, email),
    db.announcement.count({ where: { published: true, reads: { none: { userId } } } }),
    db.task.count({ where: { groupId: { not: null }, status: { not: "DONE" }, assignees: { some: { userId } } } }),
  ]);

  let approvalsWaiting = 0;
  for (const r of pendingApprovals) if (await canDecide(userId, r)) approvalsWaiting++;

  const now = Date.now();
  const nextTicket = tickets.find((t) => t.status === "valid" && new Date(t.endAt ?? t.startAt).getTime() >= now) ?? null;

  return {
    approvalsWaiting,
    openTasks,
    nextTicket,
    membership: membership
      ? {
          state: "active",
          code: membership.memberCode,
          termEnd: membership.termEnd.toISOString(),
          endsSoon: membership.termEnd.getTime() - now < RENEW_WINDOW_DAYS * 86_400_000,
        }
      : { state: "none" },
    unreadAnnouncements,
  };
}
