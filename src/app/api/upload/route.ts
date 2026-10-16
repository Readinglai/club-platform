import { NextRequest, NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/guard";
import { getSupabaseUrl } from "@/lib/supabase-storage";

export const maxDuration = 60;

const BUCKET = "images";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const MAX_BYTES = 5 * 1024 * 1024;

// Profile pictures are not offered for now, and with open signup this would
// let any new account upload to the public bucket. Flip to re-enable.
const PROFILE_PICTURE_UPLOADS_ENABLED = false;

// Any logged-in member (level 2+) can upload profile images
export async function POST(request: NextRequest) {
  if (!PROFILE_PICTURE_UPLOADS_ENABLED) {
    return NextResponse.json({ error: "Profile picture uploads are turned off" }, { status: 404 });
  }

  const guard = await requireAuthJson(2, request);
  if (guard.error) return guard.error;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use jpeg, png, webp, gif or svg." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const SUPABASE_URL = getSupabaseUrl();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const filename = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const arrayBuffer = await file.arrayBuffer();

    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${filename}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": file.type,
          "Content-Length": String(arrayBuffer.byteLength),
          "x-upsert": "true",
        },
        body: arrayBuffer,
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Storage upload failed (${res.status}): ${text || res.statusText}` },
        { status: 500 }
      );
    }

    res.body?.cancel().catch(() => {});

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
