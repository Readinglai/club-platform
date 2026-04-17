"use client";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Props {
  type: "attendance" | "members";
  label: string;
}

export default function ExportButton({ type, label }: Props) {
  function handleExport() {
    window.location.href = `/api/admin/reports/export?type=${type}`;
  }

  return (
    <button
      onClick={handleExport}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
      style={{ backgroundColor: `${SECONDARY}22`, color: PRIMARY }}
    >
      {label}
    </button>
  );
}
