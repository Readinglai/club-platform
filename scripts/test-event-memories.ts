/**
 * Checks event memories (src/lib/events/memories.ts): who may edit them,
 * saving a recap and photos, reordering, removing and the limits. Works on
 * "[TEST] Lunar New Year Night 2027" and puts it back as it was.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts   # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-event-memories.ts
 */
import { db } from "../src/lib/db";
import { canManageMemories, getEventMemories, saveEventMemories } from "../src/lib/events/memories";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const img = (n: number) => `https://example.com/test-memory-${n}.jpg`;

async function main() {
  const [eventsVp, opsVp, president] = await Promise.all(["events-vp", "ops-vp", "president"].map(user));
  const event = await db.event.findFirstOrThrow({ where: { title: "[TEST] Lunar New Year Night 2027" }, select: { id: true, settings: { select: { memoriesRecap: true } } } });
  const before = event.settings?.memoriesRecap ?? null;

  try {
    check("Events VP can edit memories", await canManageMemories(eventsVp.id));
    check("President can", await canManageMemories(president.id));
    check("Ops VP can't (not in the Website group)", !(await canManageMemories(opsVp.id)));
    check("refused without the right", !(await saveEventMemories(opsVp.id, event.id, { recap: "x" })).ok);

    let r = await saveEventMemories(eventsVp.id, event.id, {
      recap: "  A full house and a great lucky draw.  ",
      photos: [{ imageUrl: img(1), caption: "Dinner" }, { imageUrl: img(2), caption: "" }, { imageUrl: img(3), caption: "Lucky draw" }],
    });
    let m = await getEventMemories(event.id);
    check("recap saved and trimmed", r.ok && m.recap === "A full house and a great lucky draw.");
    check("three photos in order, empty caption stored as none", m.photos.map((p) => p.imageUrl).join() === [img(1), img(2), img(3)].join() && m.photos[1].caption === null);

    // Reorder, change a caption, remove the middle photo, add a new one.
    r = await saveEventMemories(eventsVp.id, event.id, {
      recap: "A full house and a great lucky draw.",
      photos: [
        { id: m.photos[2].id, imageUrl: img(3), caption: "Lucky draw winners" },
        { id: m.photos[0].id, imageUrl: img(1), caption: "Dinner" },
        { imageUrl: img(4), caption: "Group photo" },
      ],
    });
    m = await getEventMemories(event.id);
    check("reordered, recaptioned, removed and added", r.ok && m.photos.map((p) => p.caption).join("|") === "Lucky draw winners|Dinner|Group photo");
    check("removed photo is gone", (await db.eventMemoryPhoto.count({ where: { eventId: event.id } })) === 3);

    r = await saveEventMemories(eventsVp.id, event.id, { photos: [{ imageUrl: "not-a-link" }] });
    check("a photo must be an uploaded image link", !r.ok && r.status === 400);
    r = await saveEventMemories(eventsVp.id, event.id, { photos: Array.from({ length: 31 }, (_, i) => ({ imageUrl: img(i) })) });
    check("at most 30 photos", !r.ok && r.status === 400);
    r = await saveEventMemories(eventsVp.id, event.id, { recap: "x".repeat(2001) });
    check("recap length limit", !r.ok && r.status === 400);
    check("a refused save changes nothing", (await getEventMemories(event.id)).photos.length === 3);
    check("unknown event", !(await saveEventMemories(eventsVp.id, "nope", {})).ok);
  } finally {
    await db.eventMemoryPhoto.deleteMany({ where: { eventId: event.id } });
    await db.eventSettings.update({ where: { eventId: event.id }, data: { memoriesRecap: before } });
  }

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
