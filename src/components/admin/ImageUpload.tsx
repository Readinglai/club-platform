"use client";

import { useRef, useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  previewClassName?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  hint,
  previewClassName = "h-14 w-24 object-cover",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        onChange(data.url);
      } else {
        setUploadError(data.error ?? "Upload failed");
      }
    } catch {
      setUploadError("Network error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs text-gray-500 uppercase tracking-wide">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <input
          value={value}
          onChange={(e) => { setUploadError(null); onChange(e.target.value); }}
          placeholder="https://..."
          autoComplete="off"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none min-w-0"
          style={{ borderColor: "#e5e7eb", color: PRIMARY }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {uploading ? "…" : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={handleFile}
        />
      </div>
      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="preview"
          className={`rounded border ${previewClassName}`}
          style={{ borderColor: "#e5e7eb" }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
    </div>
  );
}
