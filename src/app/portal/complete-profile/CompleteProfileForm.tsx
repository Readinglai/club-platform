"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileInput } from "@/lib/membership/profile";

const PRIMARY = "#1a2744";

const FIELDS: Array<{
  key: keyof ProfileInput;
  label: string;
  required: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}> = [
  { key: "name", label: "Full name 姓名", required: true, autoComplete: "name" },
  { key: "phone", label: "Phone 電話", required: true, type: "tel", autoComplete: "tel" },
  { key: "studentNumber", label: "Student number 學號", required: true, autoComplete: "off" },
  { key: "program", label: "Program 科系", required: true, placeholder: "e.g. Computer Science" },
  { key: "yearOfStudy", label: "Year of study 年級", required: true, placeholder: "e.g. 2" },
  { key: "personalEmail", label: "Personal email (optional) 個人信箱（選填）", required: false, type: "email", autoComplete: "email" },
];

export default function CompleteProfileForm({ email, initial }: { email: string; initial: ProfileInput }) {
  const router = useRouter();
  const [values, setValues] = useState<ProfileInput>({
    name: initial.name,
    phone: initial.phone,
    studentNumber: initial.studentNumber,
    program: initial.program,
    yearOfStudy: initial.yearOfStudy,
    personalEmail: initial.personalEmail,
  });
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMissing([]);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMissing(data.missing ?? []);
        setError(data.error ?? "Could not save. Please try again.");
        return;
      }
      router.replace("/portal");
      router.refresh();
    } catch {
      setError("No connection. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium text-gray-500">Login email 登入信箱</p>
        <p className="mt-1 text-sm" style={{ color: PRIMARY }}>{email}</p>
      </div>

      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">
            {f.label}
            {f.required && <span className="text-red-600"> *</span>}
          </span>
          <input
            type={f.type ?? "text"}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            required={f.required}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder}
            aria-invalid={missing.includes(f.key)}
            className="rounded-lg border px-3 py-2.5 text-base text-gray-900 outline-none focus:ring-2"
            style={{ borderColor: missing.includes(f.key) ? "#dc2626" : "#d1d5db" }}
          />
        </label>
      ))}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-xl py-3 text-base font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: PRIMARY }}
      >
        {saving ? "Saving… 儲存中" : "Save 儲存"}
      </button>
    </form>
  );
}
