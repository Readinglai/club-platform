"use client";

/** Shared pieces for the event forms. */

export const PRIMARY = "#1a2744";
export const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900";

export const TIME_ZONES = [
  { value: "America/Toronto", label: "Toronto 多倫多" },
  { value: "Asia/Taipei", label: "Taipei 台北" },
  { value: "America/Vancouver", label: "Vancouver 溫哥華" },
  { value: "Asia/Hong_Kong", label: "Hong Kong 香港" },
  { value: "Europe/London", label: "London 倫敦" },
];

export const MODULES = [
  { key: "ticketsEnabled", label: "Tickets 票券", hint: "Free or paid tiers; free = registration" },
  { key: "checkInEnabled", label: "Check-in 入場", hint: "Scan tickets at the door" },
  { key: "budgetEnabled", label: "Budget 預算", hint: "Budget, costs and finance report" },
  { key: "dashboardEnabled", label: "Live dashboard 即時數據", hint: "Sold and checked in, live" },
] as const;

export type EventForm = {
  title: string;
  description: string;
  location: string;
  imageUrl: string;
  startAt: string;
  endAt: string;
  timezone: string;
  ticketsEnabled: boolean;
  checkInEnabled: boolean;
  budgetEnabled: boolean;
  dashboardEnabled: boolean;
};

export const emptyEvent: EventForm = {
  title: "",
  description: "",
  location: "",
  imageUrl: "",
  startAt: "",
  endAt: "",
  timezone: "America/Toronto",
  ticketsEnabled: true,
  checkInEnabled: true,
  budgetEnabled: true,
  dashboardEnabled: true,
};

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

export function EventDetailsFields({ value, onChange }: { value: EventForm; onChange: (v: EventForm) => void }) {
  const set = <K extends keyof EventForm>(key: K, v: EventForm[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Title 活動名稱 *">
          <input className={inputClass} required value={value.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
      </div>
      <Field label="Time zone 時區">
        <select className={inputClass} value={value.timezone} onChange={(e) => set("timezone", e.target.value)}>
          {TIME_ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
          {!TIME_ZONES.some((z) => z.value === value.timezone) && <option value={value.timezone}>{value.timezone}</option>}
        </select>
      </Field>
      <Field label="Location 地點">
        <input className={inputClass} value={value.location} onChange={(e) => set("location", e.target.value)} />
      </Field>
      <Field label="Starts (local time) 開始 *">
        <input className={inputClass} type="datetime-local" required value={value.startAt} onChange={(e) => set("startAt", e.target.value)} />
      </Field>
      <Field label="Ends (local time) 結束">
        <input className={inputClass} type="datetime-local" value={value.endAt} onChange={(e) => set("endAt", e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description 介紹">
          <textarea className={inputClass} rows={3} value={value.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Image link 圖片連結">
          <input className={inputClass} type="url" placeholder="https://…" value={value.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
        </Field>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="mb-2 text-xs font-medium text-gray-600">Modules 功能模組</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MODULES.map((m) => (
            <label key={m.key} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2.5 text-sm">
              <input type="checkbox" className="mt-0.5" checked={value[m.key]} onChange={(e) => set(m.key, e.target.checked)} />
              <span>
                <span className="block font-medium text-gray-900">{m.label}</span>
                <span className="text-xs text-gray-500">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}
