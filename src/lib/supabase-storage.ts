const BUCKET = "images";

function getConfig() {
  const url = process.env.STORAGE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing STORAGE_URL or SUPABASE_ANON_KEY environment variables");
  }
  return { url, key };
}

export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const { url, key } = getConfig();

  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "false",
    },
    body: new Blob([buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer], { type: contentType }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Storage upload failed (${res.status}): ${text}`);
  }

  return `${url}/storage/v1/object/public/${BUCKET}/${path}`;
}
