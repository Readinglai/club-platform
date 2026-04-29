"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";

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
  previewClassName = "h-20 object-contain",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      let data: { url?: string; error?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error("Server returned an invalid response");
      }
      if (res.ok && data.url) {
        onChange(data.url);
      } else {
        setUploadError(data.error ?? "Upload failed");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs text-gray-500 uppercase tracking-wide">{label}</label>
      )}

      {value ? (
        <div className="flex flex-col items-start gap-1.5">
          <div className="relative group inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="preview"
              className={`rounded-lg border ${previewClassName}`}
              style={{ borderColor: "#e5e7eb" }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-lg flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            >
              Change
            </button>
          </div>
          <button
            type="button"
            onClick={() => { onChange(""); setUploadError(null); }}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            ✕ Remove
          </button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && fileRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && !uploading && fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragging(false)}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors px-6 py-8 select-none"
          style={{
            borderColor: dragging ? PRIMARY : "#d1d5db",
            backgroundColor: dragging ? `${PRIMARY}06` : "white",
          }}
        >
          {uploading ? (
            <>
              <div
                className="w-6 h-6 border-2 rounded-full animate-spin"
                style={{ borderColor: `${PRIMARY}22`, borderTopColor: PRIMARY }}
              />
              <span className="text-xs text-gray-400">Uploading…</span>
            </>
          ) : (
            <>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-medium" style={{ color: PRIMARY }}>
                Click to upload or drag &amp; drop
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WebP, GIF, SVG · max 5 MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleInputChange}
      />

      {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
