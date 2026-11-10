"use client";

import { useState } from "react";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  photoUrl: string | null;
  name: string;
}

export default function AlumniPhotoCard({ photoUrl, name }: Props) {
  const [imgError, setImgError] = useState(false);

  if (!photoUrl || imgError) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: PRIMARY }}
      >
        {/* 96px circle with initials — does not fill the whole card */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center select-none"
          style={{
            backgroundColor: "rgba(201,185,154,0.15)",
            border: "1.5px solid rgba(201,185,154,0.45)",
          }}
        >
          <span className="text-2xl font-bold" style={{ color: SECONDARY }}>
            {getInitials(name)}
          </span>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoUrl}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setImgError(true)}
    />
  );
}
