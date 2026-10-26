"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ProfileInput } from "@/lib/membership/profile";

const PRIMARY = "#1a2744";

/** Labels and placeholders come from portal.completeProfile.<key> / <key>Placeholder. */
const FIELDS: Array<{
  key: keyof ProfileInput;
  required: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: "programPlaceholder" | "yearPlaceholder";
}> = [
  { key: "name", required: true, autoComplete: "name" },
  { key: "phone", required: true, type: "tel", autoComplete: "tel" },
  { key: "studentNumber", required: true, autoComplete: "off" },
  { key: "program", required: true, placeholder: "programPlaceholder" },
  { key: "yearOfStudy", required: true, placeholder: "yearPlaceholder" },
  { key: "personalEmail", required: false, type: "email", autoComplete: "email" },
];

export default function CompleteProfileForm({ email, initial }: { email: string; initial: ProfileInput }) {
  const t = useTranslations("portal.completeProfile");
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
        setError(data.error ?? t("saveError"));
        return;
      }
      router.replace("/portal");
      router.refresh();
    } catch {
      setError(t("noConnection"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-medium text-gray-500">{t("loginEmail")}</p>
        <p className="mt-1 text-sm" style={{ color: PRIMARY }}>{email}</p>
      </div>

      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">
            {t(f.key)}
            {f.required && <span className="text-red-600"> *</span>}
          </span>
          <input
            type={f.type ?? "text"}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            required={f.required}
            autoComplete={f.autoComplete}
            placeholder={f.placeholder ? t(f.placeholder) : undefined}
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
        {saving ? t("saving") : t("save")}
      </button>
    </form>
  );
}
