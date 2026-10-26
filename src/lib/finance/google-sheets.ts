/**
 * Reads a budget sheet's two tabs through the Google Sheets API, as the
 * club's robot account (a Google Cloud service account, read-only scope).
 *
 * Switched off until both env vars are set (docs/launch-todo.md §1):
 *   GOOGLE_SHEETS_CLIENT_EMAIL  — the service account's email
 *   GOOGLE_SHEETS_PRIVATE_KEY   — the "private_key" from its JSON key file
 * Each event's sheet must be shared with that email as Viewer.
 */

import crypto from "crypto";
import type { Grid } from "./budget-sheet";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://sheets.googleapis.com/v4/spreadsheets";

/** Names of the template's tabs; matched loosely in case a team renames them slightly. */
const OVERVIEW_TAB = /overview/i;
const DETAILED_TAB = /detail/i;

export class SheetAccessError extends Error {}

function config() {
  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  // Env editors often store the key's line breaks as "\n".
  return email && key ? { email, key: key.replace(/\\n/g, "\n") } : null;
}

export function sheetSyncEnabled() {
  return config() !== null;
}

/** The email teams share their sheet with (shown on the finance page). */
export function robotEmail() {
  return process.env.GOOGLE_SHEETS_CLIENT_EMAIL ?? null;
}

let cached: { token: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  const cfg = config();
  if (!cfg) throw new SheetAccessError("Sheet syncing isn't set up yet (the club's robot account).");
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const now = Math.floor(Date.now() / 1000);
  const encode = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: cfg.email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(cfg.key, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
  if (!res.ok || !body.access_token) throw new SheetAccessError("Google didn't accept the robot account's key. Check the env vars.");
  cached = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

async function call<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` }, cache: "no-store" });
  if (res.status === 403) throw new SheetAccessError(`The robot account can't open this sheet. Share it with ${robotEmail()} as Viewer.`);
  if (res.status === 404) throw new SheetAccessError("That sheet doesn't exist (check the link).");
  if (!res.ok) throw new SheetAccessError(`Google Sheets answered ${res.status}. Try again in a moment.`);
  return (await res.json()) as T;
}

/** Both tabs as cell grids (numbers as numbers, dates as shown in the sheet). */
export async function readBudgetGrids(sheetId: string): Promise<{ overview: Grid; detailed: Grid; title: string }> {
  const meta = await call<{ properties: { title: string }; sheets: Array<{ properties: { title: string } }> }>(
    `${API}/${encodeURIComponent(sheetId)}?fields=properties.title,sheets.properties.title`
  );
  const titles = meta.sheets.map((s) => s.properties.title);
  const overview = titles.find((t) => OVERVIEW_TAB.test(t));
  const detailed = titles.find((t) => DETAILED_TAB.test(t));
  if (!overview || !detailed) {
    throw new SheetAccessError('This sheet doesn\'t look like the club budget template (it needs the "Financial Overview" and "Event Budget (Detailed)" tabs).');
  }

  const range = (title: string) => `'${title.replace(/'/g, "''")}'!A1:Z300`;
  const params = new URLSearchParams({ valueRenderOption: "UNFORMATTED_VALUE", dateTimeRenderOption: "FORMATTED_STRING" });
  params.append("ranges", range(overview));
  params.append("ranges", range(detailed));
  const data = await call<{ valueRanges: Array<{ values?: Grid }> }>(`${API}/${encodeURIComponent(sheetId)}/values:batchGet?${params}`);
  return { overview: data.valueRanges[0]?.values ?? [], detailed: data.valueRanges[1]?.values ?? [], title: meta.properties.title };
}
