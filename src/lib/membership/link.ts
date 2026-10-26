/**
 * Connects an account to memberships recorded under its email (e.g. the
 * members copied from the old list), and keeps the account's role in step:
 * USER becomes MEMBER while a membership is active. Higher roles
 * (EXEC/ADMIN/SUPER_ADMIN) are never changed here.
 */

import { db } from "@/lib/db";

export async function linkMembershipsToUser(userId: string, email: string) {
  const normalized = email.trim().toLowerCase();

  await db.membership.updateMany({
    where: { userId: null, email: normalized },
    data: { userId },
  });

  const now = new Date();
  const active = await db.membership.findFirst({
    where: { userId, status: "ACTIVE", termStart: { lte: now }, termEnd: { gte: now } },
    select: { id: true },
  });

  if (active) {
    await db.user.updateMany({ where: { id: userId, role: "USER" }, data: { role: "MEMBER" } });
  }
}
