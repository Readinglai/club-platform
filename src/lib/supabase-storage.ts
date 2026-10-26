// Storage lives in the same Supabase project as the database, so its URL is
// derived from DATABASE_URL. SUPABASE_URL overrides it when set.
export function getSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;

  const dbUrl = process.env.DATABASE_URL ?? "";
  // Pooler URLs carry the ref in the user ("postgres.<ref>"),
  // direct URLs in the host ("db.<ref>.supabase.co").
  const ref =
    dbUrl.match(/^postgres(?:ql)?:\/\/[^.:@/]+\.([a-z0-9]+)[:@]/)?.[1] ??
    dbUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/)?.[1];
  if (!ref) {
    throw new Error("Cannot derive the Supabase URL from DATABASE_URL; set SUPABASE_URL");
  }
  return `https://${ref}.supabase.co`;
}

const BUCKET = "images";

export async function uploadImage(
  arrayBuffer: ArrayBuffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY environment variable");
  const SUPABASE_URL = getSupabaseUrl();

  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: arrayBuffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
