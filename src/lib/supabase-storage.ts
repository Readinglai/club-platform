import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.STORAGE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET = "images";

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });

  if (error) throw new Error(error.message);

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}
