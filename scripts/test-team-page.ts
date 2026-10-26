/**
 * Checks the public Members page settings (src/lib/team/public.ts): who may
 * edit them, hiding, titles, bios and order. Uses the real position holders
 * (test accounts never appear publicly) and restores the saved settings.
 *
 *   npx tsx --env-file=.env.local scripts/test-access-rules.ts   # creates the test users first
 *   npx tsx --env-file=.env.local scripts/test-team-page.ts
 */
import { db } from "../src/lib/db";
import { canEditTeamPage, getPublicTeam, getPublicTeamMember, saveTeamPage, TEAM_PAGE_KEY } from "../src/lib/team/public";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });

async function main() {
  const [opsVp, eventsVp, memberOnly, president] = await Promise.all(["ops-vp", "events-vp", "member-only", "president"].map(user));
  const before = await db.siteConfig.findUnique({ where: { key: TEAM_PAGE_KEY } });

  try {
    check("Ops VP can edit", await canEditTeamPage(opsVp.id));
    check("President can edit", await canEditTeamPage(president.id));
    check("Events VP can't", !(await canEditTeamPage(eventsVp.id)));
    check("a member can't", !(await canEditTeamPage(memberOnly.id)));
    check("saving without the right is refused", !(await saveTeamPage(eventsVp.id, {})).ok);

    const team = await getPublicTeam({ includeHidden: true });
    const everyone = team.flatMap((d) => d.people);
    check("test accounts never appear", !everyone.some((p) => p.name.includes("[TEST]")) && (await db.user.count({ where: { id: { in: everyone.map((p) => p.id) }, email: { endsWith: ".invalid" } } })) === 0);
    check("event teams aren't departments here", team.every((d) => ["executive", "events", "marketing", "operations", "social"].includes(d.slug)));
    const someone = everyone[0];
    if (!someone) {
      console.log("SKIP  nobody holds a position yet; the rest needs one real position holder");
    } else {
      let r = await saveTeamPage(opsVp.id, { [someone.id]: { title: "x".repeat(61) } });
      check("titles over 60 characters are refused", !r.ok && r.status === 400);

      r = await saveTeamPage(opsVp.id, { [someone.id]: { title: "Head of Events", bio: "Runs our nights out.", orders: { events: 0, nowhere: 3 } }, "not-on-team": { hidden: true } });
      check("save succeeds", r.ok);
      const shown = (await getPublicTeam()).flatMap((d) => d.people).find((p) => p.id === someone.id);
      check("public title and bio apply", shown?.title === "Head of Events" && shown.bio === "Runs our nights out.");
      const saved = JSON.parse((await db.siteConfig.findUniqueOrThrow({ where: { key: TEAM_PAGE_KEY } })).value);
      check("people not on the team are dropped", !("not-on-team" in saved));
      check("orders kept per department, unknown departments dropped", saved[someone.id]?.orders?.events === 0 && !("nowhere" in (saved[someone.id]?.orders ?? {})));
      check("profile shows the custom bio", (await getPublicTeamMember(someone.id))?.bio === "Runs our nights out.");

      r = await saveTeamPage(opsVp.id, { [someone.id]: { hidden: true } });
      check("hiding someone", r.ok && !(await getPublicTeam()).flatMap((d) => d.people).some((p) => p.id === someone.id));
      check("hidden people stay on the admin list", (await getPublicTeam({ includeHidden: true })).flatMap((d) => d.people).some((p) => p.id === someone.id && p.hidden));
      check("a hidden person's profile page is gone", (await getPublicTeamMember(someone.id)) === null);
    }
  } finally {
    if (before) await db.siteConfig.update({ where: { key: TEAM_PAGE_KEY }, data: { value: before.value } });
    else await db.siteConfig.deleteMany({ where: { key: TEAM_PAGE_KEY } });
  }

  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
