/**
 * Puts a person in a group with a position, until the admin portal can.
 *
 *   npx tsx --env-file=.env.local scripts/assign-position.ts <email> <group-slug> <PRESIDENT|VP|STAFF> [--create "Full Name"]
 *
 *   npx tsx --env-file=.env.local scripts/assign-position.ts <email> <group-slug> --remove
 *
 * --create makes the account if no user has that email (role USER).
 * Running it again with a different position updates the position.
 * --remove takes the person out of that group.
 */
import { db } from "../src/lib/db";
import type { GroupPosition } from "../src/generated/prisma/client";

const POSITIONS: GroupPosition[] = ["PRESIDENT", "VP", "STAFF"];

async function main() {
  const [emailArg, slug, positionArg] = process.argv.slice(2);
  const createIndex = process.argv.indexOf("--create");
  const createName = createIndex > -1 ? process.argv[createIndex + 1] : undefined;

  const remove = process.argv.includes("--remove");
  const email = emailArg?.trim().toLowerCase();
  const position = positionArg?.toUpperCase() as GroupPosition;
  if (!email || !slug || (!remove && !POSITIONS.includes(position))) {
    console.error("Usage: assign-position.ts <email> <group-slug> <PRESIDENT|VP|STAFF> [--create \"Full Name\"] | <email> <group-slug> --remove");
    process.exitCode = 1;
    return;
  }

  const group = await db.group.findUnique({ where: { slug } });
  if (!group) {
    console.error(`No group with slug "${slug}".`);
    process.exitCode = 1;
    return;
  }

  let user = await db.user.findUnique({ where: { email } });

  if (remove) {
    const { count } = user
      ? await db.groupMember.deleteMany({ where: { groupId: group.id, userId: user.id } })
      : { count: 0 };
    console.log(count ? `${email} removed from ${group.name}` : `${email} was not in ${group.name}`);
    return;
  }
  if (!user) {
    if (!createName) {
      console.error(`No account for ${email}. Add --create "Full Name" to create one.`);
      process.exitCode = 1;
      return;
    }
    user = await db.user.create({ data: { email, name: createName, role: "USER" } });
    console.log(`created account ${email}`);
  }

  await db.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: user.id } },
    create: { groupId: group.id, userId: user.id, position },
    update: { position },
  });
  console.log(`${email} is now ${position} in ${group.name}`);
}

main().finally(() => db.$disconnect());
