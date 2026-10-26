/**
 * Checks who may write announcements and that writing them works. Uses
 * [TEST] announcements by the test users, deleted before and after; any
 * published one is visible to members for a moment only.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts   # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-announcements.ts
 */
import { db } from "../src/lib/db";
import {
  canManageAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementForEditing,
  listAllAnnouncements,
  updateAnnouncement,
} from "../src/lib/announcements/manage";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const cleanup = () => db.announcement.deleteMany({ where: { title: { startsWith: "[TEST]" } } });

async function main() {
  await cleanup();
  const [president, eventsVp, opsVp, eventStaff, memberOnly] = await Promise.all(
    ["president", "events-vp", "ops-vp", "event-staff", "member-only"].map(user)
  );

  check("President may manage", await canManageAnnouncements(president.id));
  check("Events VP may manage", await canManageAnnouncements(eventsVp.id));
  check("Operations VP may manage", await canManageAnnouncements(opsVp.id));
  check("Staff may not", !(await canManageAnnouncements(eventStaff.id)));
  check("member may not", !(await canManageAnnouncements(memberOnly.id)));

  const denied = await createAnnouncement(eventStaff.id, { title: "[TEST] nope", content: "x" });
  check("Staff can't create", !denied.ok && denied.status === 403);
  const empty = await createAnnouncement(eventsVp.id, { title: "  ", content: "x" });
  check("title required", !empty.ok && empty.status === 400);

  const draft = await createAnnouncement(eventsVp.id, { title: "  [TEST] Room change ", content: "Moved to SS 1069." });
  check("VP creates a draft", draft.ok);
  const id = draft.ok ? draft.value.id : "";
  const saved = await getAnnouncementForEditing(id);
  check("draft is unpublished, title trimmed", saved?.published === false && saved.title === "[TEST] Room change");
  check("drafts appear in the manage list", (await listAllAnnouncements()).some((a) => a.id === id && !a.published));

  let r = await updateAnnouncement(opsVp.id, id, { content: "Moved to SS 2102." });
  check("another VP edits it", r.ok && (await getAnnouncementForEditing(id))?.content === "Moved to SS 2102.");
  r = await updateAnnouncement(memberOnly.id, id, { published: true });
  check("member can't publish", !r.ok && r.status === 403);
  r = await updateAnnouncement(eventsVp.id, id, { published: "yes" });
  check("published must be true/false", !r.ok && r.status === 400);
  r = await updateAnnouncement(eventsVp.id, id, { published: true });
  check("VP publishes", r.ok && (await getAnnouncementForEditing(id))?.published === true);
  r = await updateAnnouncement(eventsVp.id, id, { published: false });
  check("VP unpublishes", r.ok && (await getAnnouncementForEditing(id))?.published === false);
  r = await updateAnnouncement(eventsVp.id, "missing", { title: "x" });
  check("unknown announcement is 404", !r.ok && r.status === 404);

  check("Staff can't delete", !(await deleteAnnouncement(eventStaff.id, id)).ok);
  r = await deleteAnnouncement(president.id, id);
  check("President deletes it", r.ok && (await getAnnouncementForEditing(id)) === null);

  await cleanup();
  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
