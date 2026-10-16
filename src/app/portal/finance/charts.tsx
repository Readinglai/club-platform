/**
 * Small finance charts in plain HTML/CSS (no chart library).
 * Colours: the validated categorical slots 1 (blue) and 2 (orange) on a light
 * surface; values and labels use text colours, never the series colour.
 */

const SERIES_1 = "#2a78d6"; // planned / single series
const SERIES_2 = "#eb6834"; // actual
const TEXT_SECONDARY = "#52514e";
const GRID = "#e5e4df";

const WHOLE = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const CENTS = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 2 });

/** "$1,200", "$78.95", "$0.50"; negatives use a true minus sign: "−$660". */
export const cad = (n: number) => {
  const abs = Math.round(Math.abs(n) * 100) / 100;
  const text = (Number.isInteger(abs) ? WHOLE : CENTS).format(abs);
  return n < 0 && abs > 0 ? `−${text}` : text;
};

/** One horizontal bar per row, one series (no legend: the title names it). */
export function BarList({ rows, label }: { rows: Array<{ label: string; value: number }>; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-sm text-gray-500">No spending recorded.</p>;
  return (
    <figure aria-label={label} className="flex flex-col gap-2">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[8rem_1fr_5rem] items-center gap-3 text-sm" title={`${r.label}: ${cad(r.value)}`}>
          <span className="truncate" style={{ color: TEXT_SECONDARY }}>{r.label}</span>
          <span className="h-3 rounded-r" style={{ backgroundColor: GRID }}>
            <span className="block h-3 rounded-r" style={{ width: `${(r.value / max) * 100}%`, backgroundColor: SERIES_1 }} />
          </span>
          <span className="text-right tabular-nums text-gray-900">{cad(r.value)}</span>
        </div>
      ))}
    </figure>
  );
}

/** Planned vs actual per category: two thin bars per row, legend above. */
export function PlannedVsActual({ rows }: { rows: Array<{ category: string; planned: number; actual: number }> }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.planned, r.actual]));
  if (rows.length === 0) return <p className="text-sm text-gray-500">No budget or costs yet.</p>;
  return (
    <figure aria-label="Budget versus actual cost by category">
      <figcaption className="mb-3 flex gap-4 text-xs" style={{ color: TEXT_SECONDARY }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_1 }} /> Planned 預算
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: SERIES_2 }} /> Actual 實際
        </span>
      </figcaption>
      <div className="flex flex-col gap-4">
        {rows.map((r) => {
          const diff = r.actual - r.planned;
          return (
            <div key={r.category} className="grid grid-cols-[8rem_1fr] items-center gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-gray-900">{r.category}</p>
                {r.planned > 0 && diff !== 0 && (
                  <p className="text-xs" style={{ color: TEXT_SECONDARY }}>
                    {diff > 0 ? `${cad(diff)} over` : `${cad(-diff)} under`}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-[2px]">
                {[
                  { name: "Planned", value: r.planned, color: SERIES_1 },
                  { name: "Actual", value: r.actual, color: SERIES_2 },
                ].map((bar) => (
                  <div key={bar.name} className="flex items-center gap-2" title={`${r.category} · ${bar.name}: ${cad(bar.value)}`}>
                    <span className="h-2.5 flex-1 rounded-r" style={{ backgroundColor: GRID }}>
                      <span className="block h-2.5 rounded-r" style={{ width: `${(bar.value / max) * 100}%`, backgroundColor: bar.color }} />
                    </span>
                    <span className="w-16 text-right text-xs tabular-nums text-gray-900">{cad(bar.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

const STATUS: Record<string, { icon: string; label: string; color: string }> = {
  OPEN: { icon: "✎", label: "Open · team editing 編輯中", color: "#52514e" },
  SUBMITTED: { icon: "⏳", label: "Submitted · waiting for review 待審核", color: "#8a5a00" },
  APPROVED: { icon: "✓", label: "Approved 已核准", color: "#087208" },
  RETURNED: { icon: "↩", label: "Returned · needs changes 退回修改", color: "#b42318" },
};

/** Report status: always icon + words, never colour alone. */
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.OPEN;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium" style={{ color: s.color, borderColor: "#d6d4cc" }}>
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm" style={{ border: "1px solid #e5e7eb" }}>
      <p className="text-xs" style={{ color: TEXT_SECONDARY }}>{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs" style={{ color: TEXT_SECONDARY }}>{hint}</p>}
    </div>
  );
}
