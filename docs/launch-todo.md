# Launch to-do (feature/member-platform)

Things that need a person, an account or a decision before or at release.
Merge only after Halloween 2026.

---

## 1. Google Sheets robot account (one-time, for budget sync)

**Who:** whoever manages the club's Google Cloud project — the one where
"Sign in with Google" is set up (it owns the `GOOGLE_CLIENT_ID`).
**Time:** about 10 minutes.

1. Open <https://console.cloud.google.com> and select the club's project.
2. **APIs & Services → Library**, search **Google Sheets API**, click **Enable**.
3. **IAM & Admin → Service Accounts → Create service account**
   - Name: `budget-reader` (any name is fine).
   - Skip "Grant this service account access to project" — it needs **no project roles**.
   - Click **Done**.
4. Open the new service account → **Keys → Add key → Create new key → JSON**.
   A `.json` file downloads. **Treat it like a password**: don't email it or put it in chat.
5. Send to the developer, privately:
   - the service account **email** (looks like `budget-reader@<project>.iam.gserviceaccount.com`), and
   - the **JSON key file** (e.g. via a password manager's secure share).
6. The developer adds it as two env vars (see section 2) — nothing else in Google Cloud.

After that, **each event host** shares their event's budget sheet with that
email as **Viewer** (Share → paste the email → Viewer) and pastes the sheet
link on the event's **Finance** page (Connect, then Sync now). Sheets must **not**
be "anyone with the link".

What the website does with it (already built, switched on by these two env vars):
- **Sync now** on the event's Finance page reads the sheet straight away.
- A daily job (`/api/cron/budget-sync`, 08:00 UTC, in `vercel.json`) re-reads every
  connected sheet for events from 60 days ago to a year ahead. It needs `CRON_SECRET`.
- Testing round: the "Later round" checklist in the team testing handout.

---

## 2. Vercel environment variables (Production)

Set in Vercel → project → Settings → Environment Variables. Needs someone with Vercel access.

### Already set — keep as they are
| Variable | Note |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Production database (project `jttn…`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google login |
| `STRIPE_SECRET_KEY` | Live key (`sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Live webhook secret (see the Stripe note below) |
| `STAFF_CHECKIN_CODE` | Door scanner code |
| `EMAIL_USER`, `EMAIL_PASSWORD` | Gmail sender for login links and tickets |
| `CRON_SECRET` | Lets Vercel's scheduler call the site (also used by the daily sheet sync) |

### Change
| Variable | New value |
|---|---|
| `NEXTAUTH_URL` | The final site address, e.g. `https://www.rocsaut.ca` |
| `AUTH_SECRET` | A fresh value (`openssl rand -base64 32`). Logs everyone out once — recommended because the old app login was exposed. |
| `SUPABASE_ANON_KEY` | The **anon / publishable** key of the current project (`jttn…`, Supabase → Settings → API Keys). Today uploads go to the old project. |

### Add
| Variable | Value | When |
|---|---|---|
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Service account email from section 1 | When budget sync ships |
| `GOOGLE_SHEETS_PRIVATE_KEY` | The `private_key` value from the JSON key file | When budget sync ships |
| `PASS2U_API_KEY` | From Pass2U (section 4) | Only if API access is obtained |
| `PASS2U_MODEL_ID` | The member-card model's ID | Only if API access is obtained |

### Remove / never set
| Variable | Why |
|---|---|
| `ALLOW_DEV_BYPASS` | Lets anyone log in as anyone. Must not exist. |
| `GOOGLE_IOS_CLIENT_ID` | Only used by the removed app login. |

### Outside Vercel, at the same time
- **Google login:** in Google Cloud → Credentials → the OAuth client, add the
  authorized redirect URI `https://<final-domain>/api/auth/callback/google`.
- **Stripe:** the live webhook endpoint must be `https://<final-domain>/api/stripe/webhook`,
  sending `checkout.session.completed` and `checkout.session.expired`.
- **Supabase storage:** in project `jttn…`, a **public** bucket named `images`.

---

## 3. Taking over www.rocsaut.ca

The previous person who registered it can't be found.

1. Look it up at <https://lookup.icann.org> (or <https://www.cira.ca> for `.ca`):
   note the **registrar**, the **registrant** name and the **expiry date**.
2. If the registrant is the **club** (e.g. "ROCSAUT"), contact that registrar,
   explain the club is the registrant, and ask for an ownership/contact change.
   Have proof ready (e.g. the club's UofT recognition, an officer letter).
3. If it's registered to a **person**, the registrar can't hand it over without
   them; ask the registrar what they accept, and keep trying to reach that person
   (old exec lists, alumni).
4. Otherwise, **watch the expiry date**: if it isn't renewed it is eventually
   released and can be registered by the club (a backorder service can grab it).
5. Once the club controls it: add the domain in Vercel → Domains and set the DNS
   records Vercel shows. If the domain has email, keep its existing **MX** records.
6. Then update `NEXTAUTH_URL`, the Google redirect URI and the Stripe webhook (section 2).

Until then the site runs on `club-platform-roan.vercel.app`.

---

## 4. Linking Pass2U (member wallet passes)

The code is built and switched off until two env vars are set. The 143 imported
members **already have passes** — never bulk-issue for them.

1. **Model:** in the Pass2U dashboard, design (or reuse) the member card model:
   - Fields set to **Dynamic** with keys exactly `name`, `memberCode`, `validUntil`.
   - Barcode type **"Dynamic - assigned by CSV file or API"**.
   - Issue the model and note its **Model ID**.
2. **API key:** the Pass API guide says API access comes with the **Enterprise plan**.
   Ask Pass2U (account page "apply for API key", or contact@micromacro.com.tw):
   *"Can a pay-per-use (credits) account get Pass API access, and what does it cost?"*
3. If approved: set `PASS2U_API_KEY` and `PASS2U_MODEL_ID` (Vercel, and `.env.local` to test).
4. Test with a Stripe test-mode membership purchase: the welcome email and
   Portal → Membership should show **"Add to Wallet"**.
5. If API access isn't possible: keep issuing passes by hand (or ask about CSV import).

**Until this is decided, every online membership skips the wallet pass** (the
welcome email and Portal → Membership simply show no "Add to Wallet" button).
- [ ] Decide: Pass2U Enterprise/API access, issuing by hand, or dropping wallet passes.
- [ ] If passes are switched on later, backfill everyone who joined online in the
      meantime: `npx tsx --env-file=.env.local scripts/issue-wallet-passes.ts`
      (dry run first, then `--apply`; imported members are skipped automatically).
- [ ] If issuing by hand instead, list online members without a pass from the
      Members page (source "Paid online") and issue them in the Pass2U dashboard.

---

## 5. Before merging into main

- [ ] Halloween 2026 is over.
- [ ] **Assign every current staff member a group position** (President, VPs, staff) —
      the old ADMIN/EXEC roles no longer grant anything, so without a position an exec
      only sees the member pages. List of names/emails/groups: _to be provided_.
- [ ] Paid ticket test (Stripe test mode): checkout, webhook, sell-out, expiry, duplicate, cancel.
- [ ] Scanner test: new ticket ADMIT → ALREADY IN, fake code NOT FOUND, no staff code refused,
      a Halloween ticket still works.
- [ ] Real membership payment test (test mode).
- [ ] Fresh backups of the protected tables.
- [ ] Read-only check: production database vs the migration files.
- [ ] Remove test data (`@test.rocsaut.invalid`, `[TEST]`, `[DEMO]` unless kept on purpose,
      `john@president.invalid` once a real President exists, the abandoned PENDING membership
      checkout of hrex2006@gmail.com from 2026-10-16).
- [ ] Re-run `scripts/copy-legacy-members.ts` (dry run, then `--apply`) to catch new members.
- [ ] Vercel env vars and outside settings (section 2).

---

## 6. Decisions parked for later

- Approval of event budgets: in the sheet's approval block, or in the app?
- Club-wide money (opening balance, sponsorships, fees): a master sheet later.
- Readable event addresses (`/events/<name>-<year>`).
- Member code scheme for future school years.
- Who sees member announcements.
- Partner types (sponsors vs collab stores).
- Clubs-fair signup experience.
- Drop the unused `GroupPosition_old` type.
- Phase 8 (public site): the members directory (`/members`, `/api/members`) still groups
  people by the old EXEC/MEMBER role; base it on positions instead.
- Companion iOS app: its token sign-in was removed and the old `/api/exec/*` and
  `/api/admin/*` task, member, event and finance routes are gone; it needs a new sign-in
  and the `/api/work/*`, `/api/club/*` and `/api/me/*` routes.
- Tidy the `admin.*` text keys that only the removed /admin pages used.
