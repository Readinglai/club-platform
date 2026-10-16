/**
 * Member wallet passes through Pass2U (Pass2U Pass API v2, "Pass API User Guide").
 *
 * Switched off until both env vars are set:
 *   PASS2U_API_KEY   — from the Pass2U account page (API access needs the Enterprise plan)
 *   PASS2U_MODEL_ID  — the member-card model designed and issued in the Pass2U dashboard
 *
 * The model must have these fields set to "Dynamic" in the Model Designer, and its
 * barcode set to "Dynamic - assigned by CSV file or API". Each create costs 3 credits.
 */

import type { Membership } from "@/generated/prisma/client";

const API_BASE = "https://api.pass2u.net/v2";

/** Keys of the model's Dynamic fields; must match the Pass2U model exactly. */
export const PASS2U_FIELD_KEYS = {
  name: "name",
  memberCode: "memberCode",
  validUntil: "validUntil",
} as const;

export function walletPassUrl(passId: string) {
  return `https://www.pass2u.net/d/${encodeURIComponent(passId)}`;
}

function config() {
  const apiKey = process.env.PASS2U_API_KEY;
  const modelId = process.env.PASS2U_MODEL_ID;
  return apiKey && modelId ? { apiKey, modelId } : null;
}

export function walletPassesEnabled() {
  return config() !== null;
}

/**
 * Creates the member's pass. Returns the Pass2U passId, or null when passes
 * are switched off. Throws if Pass2U rejects the request.
 */
export async function createMemberPass(membership: Pick<Membership, "name" | "memberCode" | "termEnd">) {
  const cfg = config();
  if (!cfg) return null;

  const validUntil = membership.termEnd.toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const body = {
    expirationDate: membership.termEnd.toISOString(),
    barcode: { message: membership.memberCode, altText: membership.memberCode },
    fields: [
      { key: PASS2U_FIELD_KEYS.name, value: membership.name ?? "" },
      { key: PASS2U_FIELD_KEYS.memberCode, value: membership.memberCode },
      { key: PASS2U_FIELD_KEYS.validUntil, value: validUntil },
    ],
  };

  const res = await pass2uFetch(`${API_BASE}/models/${encodeURIComponent(cfg.modelId)}/passes`, {
    method: "POST",
    headers: {
      "x-api-key": cfg.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as { passId?: string };
  if (!data.passId) throw new Error("Pass2U response had no passId");
  return data.passId;
}

/** Retries once on the errors the guide marks as retryable (429, 503, 504). */
async function pass2uFetch(url: string, init: RequestInit) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    if (res.ok) return res;

    const retryable = [429, 503, 504].includes(res.status);
    if (retryable && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    const message = await res.text().catch(() => "");
    throw new Error(`Pass2U ${res.status}: ${message.slice(0, 300)}`);
  }
}
