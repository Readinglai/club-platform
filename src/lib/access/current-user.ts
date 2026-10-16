/**
 * The one place that answers "who is making this request?".
 *
 * Today it reads the web session cookie. A phone app would add its token
 * check here, and every feature using getCurrentUser() would work for it.
 * The role comes from the database, not the session, so a role change
 * applies on the next request.
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/client";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  return db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true },
  });
}
