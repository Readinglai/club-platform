"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const PRIMARY   = "#1a2744";

interface AlumniRow {
  id: string;
  name: string;
  graduationYear: number | null;
  position: string | null;
  department: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  photoUrl: string | null;
  isPublic: boolean;
}

interface Props {
  alumni: AlumniRow[];
  locale: string;
}

const EMPTY_FORM = {
  name: "",
  graduationYear: "",
  position: "",
  department: "",
  bio: "",
  linkedinUrl: "",
  instagramUrl: "",
  photoUrl: "",
  isPublic: true,
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

function Field({ label, value, onChange, placeholder, type = "text", required = false }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
      />
    </div>
  );
}

interface FormFieldsProps {
  form: typeof EMPTY_FORM;
  onChange: (key: keyof typeof EMPTY_FORM, val: string | boolean) => void;
  labels: {
    name: string; year: string; position: string; department: string;
    photo: string; bio: string; isPublic: string;
  };
}

function AlumniFormFields({ form, onChange, labels }: FormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={labels.name} value={form.name} onChange={(v) => onChange("name", v)} required />
        <Field label={labels.year} value={form.graduationYear} onChange={(v) => onChange("graduationYear", v)} type="number" />
        <Field label={labels.position} value={form.position} onChange={(v) => onChange("position", v)} />
        <Field label={labels.department} value={form.department} onChange={(v) => onChange("department", v)} />
        <Field label="LinkedIn URL" value={form.linkedinUrl} onChange={(v) => onChange("linkedinUrl", v)} placeholder="https://linkedin.com/in/..." />
        <Field label="Instagram URL" value={form.instagramUrl} onChange={(v) => onChange("instagramUrl", v)} placeholder="https://instagram.com/..." />
        <Field label={labels.photo} value={form.photoUrl} onChange={(v) => onChange("photoUrl", v)} placeholder="https://..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{labels.bio}</label>
        <textarea
          value={form.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition resize-none"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={form.isPublic}
          onChange={(e) => onChange("isPublic", e.target.checked)}
          className="rounded"
        />
        <span className="text-sm text-gray-600">{labels.isPublic}</span>
      </label>
    </>
  );
}

export default function AlumniManager({ alumni: initial, locale: _locale }: Props) {
  const t = useTranslations("admin.alumni");
  const tc = useTranslations("admin.common");
  const router = useRouter();
  const [alumni, setAlumni] = useState<AlumniRow[]>(initial);

  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);

  const fieldLabels = {
    name: t("fieldName"),
    year: t("fieldYear"),
    position: t("fieldPosition"),
    department: t("fieldDepartment"),
    photo: t("fieldPhoto"),
    bio: t("fieldBio"),
    isPublic: t("fieldPublic"),
  };

  function updateCreateForm(key: keyof typeof EMPTY_FORM, val: string | boolean) {
    setCreateForm((f) => ({ ...f, [key]: val }));
  }

  function updateEditForm(key: keyof typeof EMPTY_FORM, val: string | boolean) {
    setEditForm((f) => ({ ...f, [key]: val }));
  }

  async function createAlumni() {
    if (!createForm.name.trim()) {
      setCreateError(t("nameRequired"));
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          graduationYear: createForm.graduationYear ? parseInt(createForm.graduationYear, 10) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error ?? tc("createFailed"));
        return;
      }
      const newAlumni: AlumniRow = await res.json();
      setAlumni((prev) => [newAlumni, ...prev]);
      setCreateForm({ ...EMPTY_FORM });
      setShowNew(false);
      router.refresh();
    } catch {
      setCreateError(tc("networkErrorRetry"));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(a: AlumniRow) {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      graduationYear: a.graduationYear?.toString() ?? "",
      position: a.position ?? "",
      department: a.department ?? "",
      bio: a.bio ?? "",
      linkedinUrl: a.linkedinUrl ?? "",
      instagramUrl: a.instagramUrl ?? "",
      photoUrl: a.photoUrl ?? "",
      isPublic: a.isPublic,
    });
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!editForm.name.trim()) {
      setEditError(t("nameRequired"));
      return;
    }
    setUpdating(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/alumni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          graduationYear: editForm.graduationYear ? parseInt(editForm.graduationYear, 10) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error ?? tc("updateFailed"));
        return;
      }
      const updated: AlumniRow = await res.json();
      setAlumni((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditingId(null);
      router.refresh();
    } catch {
      setEditError(tc("networkErrorRetry"));
    } finally {
      setUpdating(false);
    }
  }

  async function togglePublic(id: string, current: boolean) {
    try {
      const res = await fetch(`/api/admin/alumni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !current }),
      });
      if (res.ok) {
        setAlumni((prev) =>
          prev.map((a) => (a.id === id ? { ...a, isPublic: !current } : a))
        );
      }
    } catch {
      // silent
    }
  }

  async function deleteAlumni(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/alumni/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAlumni((prev) => prev.filter((a) => a.id !== id));
        router.refresh();
      }
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {!showNew && (
        <button
          onClick={() => { setShowNew(true); setCreateError(null); }}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition hover:opacity-90"
          style={{ backgroundColor: PRIMARY }}
        >
          {t("createButton")}
        </button>
      )}

      {showNew && (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-3">
          <AlumniFormFields form={createForm} onChange={updateCreateForm} labels={fieldLabels} />
          {createError && <p className="text-sm text-red-500">{createError}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={createAlumni}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              {creating ? t("processing") : t("createSubmit")}
            </button>
            <button
              onClick={() => { setShowNew(false); setCreateError(null); setCreateForm({ ...EMPTY_FORM }); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      )}

      {alumni.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">{t("emptyState")}</p>
      ) : (
        <div className="space-y-2">
          {alumni.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-white">
                {a.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.photoUrl}
                    alt={a.name}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: `${PRIMARY}18`, color: PRIMARY }}
                  >
                    {a.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => editingId === a.id ? setEditingId(null) : startEdit(a)}
                    className="font-medium text-sm hover:underline text-left truncate block"
                    style={{ color: PRIMARY }}
                  >
                    {a.name}
                  </button>
                  <p className="text-xs text-gray-400 truncate">
                    {[a.graduationYear, a.position, a.department].filter(Boolean).join("  ·  ") || t("noExtraInfo")}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      a.isPublic
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {a.isPublic ? t("statusPublic") : t("statusHidden")}
                  </span>
                  <button
                    onClick={() => togglePublic(a.id, a.isPublic)}
                    className="text-xs px-2 py-1 rounded-full font-medium transition bg-amber-50 text-amber-700 hover:bg-amber-100"
                  >
                    {a.isPublic ? t("toggleHide") : t("togglePublic")}
                  </button>

                  <button
                    onClick={() => editingId === a.id ? setEditingId(null) : startEdit(a)}
                    className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1"
                  >
                    {editingId === a.id ? t("collapseButton") : t("editButton")}
                  </button>

                  <button
                    onClick={() => deleteAlumni(a.id)}
                    disabled={deleting === a.id}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 disabled:opacity-50"
                  >
                    {deleting === a.id ? t("deleting") : tc("delete")}
                  </button>
                </div>
              </div>

              {editingId === a.id && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <div className="pt-4 border border-gray-200 rounded-xl p-5 space-y-3">
                    <AlumniFormFields form={editForm} onChange={updateEditForm} labels={fieldLabels} />
                    {editError && <p className="text-sm text-red-500">{editError}</p>}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(a.id)}
                        disabled={updating}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50"
                        style={{ backgroundColor: PRIMARY }}
                      >
                        {updating ? t("processing") : t("editSubmit")}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        {tc("cancel")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
