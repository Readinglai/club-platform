"use client";

import { useState } from "react";

const PRIMARY = "#1a2744";

interface Props {
  src: string;
  alt: string;
  height: number;
  maxWidth?: number;
}

export function SponsorLogoImg({ src, alt, height, maxWidth = 160 }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="text-sm font-semibold text-center px-1" style={{ color: PRIMARY }}>
        {alt}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="object-contain"
      style={{ height, maxWidth }}
      onError={() => setFailed(true)}
    />
  );
}
