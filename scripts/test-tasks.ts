/**
 * Checks tasks, discussion and votes on departments/groups with labelled test
 * data (test users from test-access-rules.ts; a [TEST] group under Events).
 *
 *   npx tsx --env-file=.env.local scripts/test-tasks.ts
 */
import { db } from "../src/lib/db";
import { GROUP_SLUGS as G } from "../src/lib/access/groups";
import { myTaskGroups } from "../src/lib/tasks/access";
import { addComment, closeVote, createTask, createVote, deleteComment, deleteTask, getGroupBoard, getMyTasks, respondToVote, searchStaff, updateTask } from "../src/lib/tasks/tasks";

let failed = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` (${detail})` : ""}`);
}
const user = (key: string) => db.user.findUniqueOrThrow({ where: { email: `${key}@test.rocsaut.invalid` } });
const SLUG = "events-test-committee";

async function cleanup() {
  const g = await db.group.findUnique({ where: { slug: SLUG }, select: { id: true } });
  if (!g) return;
  const tasks = await db.task.findMany({ where: { groupId: g.id }, select: { id: true } });
  await db.taskAssignee.deleteMany({ where: { taskId: { in: tasks.map((t) => t.id) } } });
  await db.task.deleteMany({ where: { groupId: g.id } });
  const d = await db.discussion.findUnique({ where: { groupId: g.id }, select: { id: true } });
  if (d) { await db.comment.deleteMany({ where: { discussionId: d.id } }); await db.discussion.delete({ where: { id: d.id } }); }
  const votes = await db.vote.findMany({ where: { groupId: g.id }, select: { id: true } });
  const opts = await db.voteOption.findMany({ where: { voteId: { in: votes.map((v) => v.id) } }, select: { id: true } });
  await db.voteResponse.deleteMany({ where: { voteOptionId: { in: opts.map((o) => o.id) } } });
  await db.voteOption.deleteMany({ where: { voteId: { in: votes.map((v) => v.id) } } });
  await db.vote.deleteMany({ where: { groupId: g.id } });
  await db.groupMember.deleteMany({ where: { groupId: g.id } });
  await db.group.delete({ where: { id: g.id } });
}

async function main() {
  await cleanup();
  const [eventsVp, eventStaff, financeStaff, opsVp, memberOnly] = await Promise.all(["events-vp", "event-staff", "finance-staff", "ops-vp", "member-only"].map(user));
  const events = await db.group.findUniqueOrThrow({ where: { slug: G.events } });
  // A cross-department committee under Events: event staff + finance staff.
  const committee = await db.group.create({ data: { slug: SLUG, name: "[TEST] Halloween committee", parentId: events.id } });
  await db.groupMember.createMany({ data: [{ groupId: committee.id, userId: eventStaff.id, position: "STAFF" }, { groupId: committee.id, userId: financeStaff.id, position: "STAFF" }] });

  // Tasks
  let r = await createTask(memberOnly.id, committee.id, { title: "X" });
  check("non-member can't create tasks", !r.ok);
  r = await createTask(eventStaff.id, committee.id, { title: "Book the DJ", dueAt: "2027-01-15", assigneeIds: [opsVp.id] });
  check("group staff creates a task and assigns someone from Operations", r.ok);
  const taskId = r.ok ? r.value! : "";
  const t1 = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  check("due date stored as 11:59 PM Toronto", t1.dueAt?.toISOString() === "2027-01-16T04:59:00.000Z", t1.dueAt?.toISOString());
  r = await createTask(eventStaff.id, committee.id, { title: "Y", assigneeIds: [memberOnly.id] });
  check("can't assign a non-staff member", !r.ok);

  check("assignee sees it under My tasks", (await getMyTasks(opsVp.id)).some((t) => t.id === taskId));
  check("assignee (outside the group) can change status", (await updateTask(opsVp.id, taskId, { status: "IN_PROGRESS" })).ok);
  await updateTask(opsVp.id, taskId, { title: "Renamed by assignee" });
  check("assignee can't rename the task", (await db.task.findUniqueOrThrow({ where: { id: taskId } })).title === "Book the DJ");
  check("group staff edits title and assignees", (await updateTask(financeStaff.id, taskId, { title: "Book the DJ and lights", assigneeIds: [opsVp.id, eventStaff.id] })).ok);
  check("non-member can't edit", !(await updateTask(memberOnly.id, taskId, { status: "DONE" })).ok);
  check("staff can't delete tasks", !(await deleteTask(eventStaff.id, taskId)).ok);

  // Board visibility
  check("group staff see the board", (await getGroupBoard(financeStaff.id, committee.id)) !== null);
  check("Events VP (manages the parent) sees the board", (await getGroupBoard(eventsVp.id, committee.id))?.rights.manage === true);
  check("outsider can't see the board", (await getGroupBoard(memberOnly.id, committee.id)) === null);
  check("committee appears in staff's Tasks groups", (await myTaskGroups(financeStaff.id)).some((g) => g.id === committee.id));

  // Discussion
  check("staff comments", (await addComment(financeStaff.id, committee.id, { content: "Budget for the DJ is $400" })).ok);
  const comment = await db.comment.findFirstOrThrow({ where: { discussion: { groupId: committee.id } } });
  check("others can't remove someone's comment", !(await deleteComment(eventStaff.id, comment.id)).ok);
  check("VP can remove any comment", (await deleteComment(eventsVp.id, comment.id)).ok);

  // Votes
  check("vote needs two options", !(await createVote(eventStaff.id, committee.id, { title: "Theme?", options: ["Zombies"] })).ok);
  check("staff starts a vote", (await createVote(eventStaff.id, committee.id, { title: "Theme?", options: ["Zombies", "Vampires", "Zombies"] })).ok);
  const vote = await db.vote.findFirstOrThrow({ where: { groupId: committee.id }, include: { options: true } });
  check("duplicate options merged", vote.options.length === 2);
  await respondToVote(financeStaff.id, vote.id, vote.options[0].id);
  await respondToVote(financeStaff.id, vote.id, vote.options[1].id);
  const board = await getGroupBoard(financeStaff.id, committee.id);
  const counts = board!.votes[0].options.map((o) => o.count);
  check("answering again replaces the earlier answer", counts.reduce((a, b) => a + b, 0) === 1, JSON.stringify(counts));
  check("only the starter or a VP closes the vote", !(await closeVote(financeStaff.id, vote.id)).ok && (await closeVote(eventStaff.id, vote.id)).ok);
  check("closed vote takes no answers", !(await respondToVote(financeStaff.id, vote.id, vote.options[0].id)).ok);

  check("staff search finds staff only", (await searchStaff("ops-vp")).length === 1 && (await searchStaff("member-only")).length === 0);
  check("VP deletes the task", (await deleteTask(eventsVp.id, taskId)).ok);

  await cleanup();
  console.log(`\n${failed ? "SOME CHECKS FAILED" : "all checks passed"}`);
  process.exitCode = failed ? 1 : 0;
}

main().finally(() => db.$disconnect());
