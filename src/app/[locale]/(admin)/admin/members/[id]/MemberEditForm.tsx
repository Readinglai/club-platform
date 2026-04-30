"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ImageUpload from "@/components/admin/ImageUpload";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface Department {
  id: string;
  slug: string;
  name: string;
}

interface Props {
  member: {
    id: string;
    name: string;
    role: string;
    departmentId: string | null;
    image: string | null;
    bio: string | null;
    major: string | null;
    rocsautYear: number | null;
    instagram: string | null;
    linkedin: string | null;
  };
  departments: Department[];
  locale: string;
}

export default function MemberEditForm({ member, departments, locale }: Props) {
  const router = useRouter();
  const t = useTranslations("admin.members");
  const tc = useTranslations("admin.common");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [avatar, setAvatar] = useState(member.image ?? "");
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSaved, setAvatarSaved] = useState(false);

  const ROLES = [
    { value: "ADMIN",  label: t("roleAdmin") },
    { value: "EXEC",   label: t("roleExec") },
    { value: "MEMBER", label: t("roleMember") },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const fd = new FormData(e.currentTarget);
    const rocsautYearRaw = fd.get("rocsautYear") as string;
    const body = {
      name: fd.get("name") as string,
      role: fd.get("role") as string,
      departmentId: (fd.get("departmentId") as string) || null,
      bio: (fd.get("bio") as string) || null,
      major: (fd.get("major") as string) || null,
      rocsautYear: rocsautYearRaw ? parseInt(rocsautYearRaw, 10) : null,
      instagram: (fd.get("instagram") as string) || null,
      linkedin: (fd.get("linkedin") as string) || null,
    };

    const res = await fetch(`/api/admin/members/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? tc("updateFailed"));
    }
    setSubmitting(false);
  }

  async function handleAvatarChange(url: string) {
    setAvatar(url);
    setAvatarSaving(true);
    setAvatarError(null);
    setAvatarSaved(false);
    try {
      const res = await fetch(`/api/admin/members/${member.id}/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: url || null }),
      });
      if (res.ok) {
        setAvatarSaved(true);
        setTimeout(() => setAvatarSaved(false), 2000);
        router.refresh();
      } else {
        const data = await res.json();
        setAvatarError(data.error ?? "Failed to save");
      }
    } catch {
      setAvatarError("Network error");
    } finally {
      setAvatarSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar section */}
      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
          {t("fieldAvatar")}
        </h3>
        <ImageUpload
          value={avatar}
          onChange={handleAvatarChange}
          previewClassName="h-20 w-20 object-cover rounded-full"
        />
        {avatarSaving && <p className="text-xs text-gray-400">Saving…</p>}
        {avatarSaved && <p className="text-xs text-green-600">✓ Saved</p>}
        {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
      </div>

      {/* Info form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-5">
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
            {t("memberUpdated")}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            {t("fieldName")}
          </label>
          <input
            name="name"
            required
            defaultValue={member.name}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            {t("fieldRole")}
          </label>
          <select
            name="role"
            defaultValue={member.role}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            {t("fieldDepartment")}
          </label>
          <select
            name="departmentId"
            defaultValue={member.departmentId ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          >
            <option value="">{t("noDepartment")}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}（{d.slug}）</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            Bio
          </label>
          <textarea
            name="bio"
            rows={3}
            defaultValue={member.bio ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            Major
          </label>
          <input
            name="major"
            defaultValue={member.major ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            ROCSAUT Year
          </label>
          <input
            name="rocsautYear"
            type="number"
            min={1}
            defaultValue={member.rocsautYear ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            Instagram
          </label>
          <input
            name="instagram"
            defaultValue={member.instagram ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>
            LinkedIn
          </label>
          <input
            name="linkedin"
            defaultValue={member.linkedin ?? ""}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ borderColor: "#e5e7eb", color: PRIMARY }}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {submitting ? tc("saving") : tc("saveChanges")}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/admin/members`)}
            className="px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
            style={{ color: PRIMARY, backgroundColor: `${PRIMARY}10` }}
          >
            {tc("backToList")}
          </button>
        </div>
      </form>
    </div>
  );
}
