# Script baseline inventory

Snapshot: 2026-11-02. Scripts have not been executed as part of this inventory. Database scripts are not isolated from the database configured by their environment. Inspect setup, cleanup and external-service calls before running.

## Verification scripts

| Script | Classification | Prerequisites / effects |
|---|---|---|
| [test-access-rules.ts](../scripts/test-access-rules.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-announcements.ts](../scripts/test-announcements.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-budget-sheet.ts](../scripts/test-budget-sheet.ts) | Pure logic assertions | No database required; fixtures or explicit cases. |
| [test-event-delete.ts](../scripts/test-event-delete.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-event-memories.ts](../scripts/test-event-memories.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-events.ts](../scripts/test-events.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-finance.ts](../scripts/test-finance.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-legacy-paths.ts](../scripts/test-legacy-paths.ts) | Pure logic assertions | No database required; fixtures or explicit cases. |
| [test-member-redemption.ts](../scripts/test-member-redemption.ts) | Manual database probe | Hard-coded event/member identifiers; prints result rather than asserting business outcome; can write reservations. |
| [test-members-admin.ts](../scripts/test-members-admin.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-membership-purchase.ts](../scripts/test-membership-purchase.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-reports.ts](../scripts/test-reports.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-reserve-capacity.ts](../scripts/test-reserve-capacity.ts) | Manual database probe | Hard-coded event/member identifiers; prints result rather than asserting business outcome; can write reservations. |
| [test-sheet-sync.ts](../scripts/test-sheet-sync.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-signup-flow.ts](../scripts/test-signup-flow.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |
| [test-team-page.ts](../scripts/test-team-page.ts) | Database-backed assertions | Inspect source for fixture users/events, writes, cleanup and service imports; not proven standalone. |

## Setup and maintenance

These are operational utilities, not automated tests. Classification describes intended purpose; it is not authorization to execute them.

| Script | Purpose |
|---|---|
| [assign-position.ts](../scripts/assign-position.ts) | Assign group position |
| [copy-legacy-members.ts](../scripts/copy-legacy-members.ts) | Import legacy memberships; dry run unless --apply |
| [create-test-ticket.ts](../scripts/create-test-ticket.ts) | Create ticket fixture |
| [create-ticket-hold-table.ts](../scripts/create-ticket-hold-table.ts) | Create legacy reservation table/indexes outside tracked Prisma migrations |
| [delete-test-hold.ts](../scripts/delete-test-hold.ts) | Delete reservation fixture |
| [delete-test-member-redemption.ts](../scripts/delete-test-member-redemption.ts) | Delete member redemption fixture |
| [issue-wallet-passes.ts](../scripts/issue-wallet-passes.ts) | Issue external wallet passes with --apply; consumes credits |
| [seed-demo-finance.ts](../scripts/seed-demo-finance.ts) | Seed finance demo records |
| [seed-test-event.ts](../scripts/seed-test-event.ts) | Seed legacy event fixture |
| [setup-groups.ts](../scripts/setup-groups.ts) | Set up group hierarchy |

Other entry points: `prisma/seed.ts` seeds database data; root `commit_*.bat` and `push_*.bat` perform Git operations; `自動玩monopoly的腳本.py` is a separate automation script whose removal needs a reference/purpose check. None were removed or executed.

## Known dependencies

- `test-access-rules.ts` creates/updates fixture identities and expects the seeded Phase 0 event and groups. It is not a complete database bootstrap.
- `test-events.ts` expects fixture users and creates/deletes its test event and associated records.
- `test-finance.ts` expects demo finance records and fixture users.
- `test-sheet-sync.ts` expects fixture users, the Lunar New Year test event and demo data; modifies database records using sheet fixtures.
- `test-team-page.ts` edits site configuration and attempts to restore it.
- Tests are currently invoked individually with `tsx`; it is not a direct development dependency. A reproducible test runner is step two.
- No coverage report, browser suite, or repository GitHub Actions configuration was found.
