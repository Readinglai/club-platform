import { createClient } from "@supabase/supabase-js";

const BUCKET = "images";

function getClient() {
  const url = process.env.STORAGE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing STORAGE_URL or SUPABASE_ANON_KEY environment variables"
    );
  }
  return createClient(url, key);
}

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const supabase = getClient();
  const storageUrl = process.env.STORAGE_URL!;

  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });

  if (error) throw new Error(error.message);

  return `${storageUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}
