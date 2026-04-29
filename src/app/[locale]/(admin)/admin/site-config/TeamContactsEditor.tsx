"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export interface TeamContact {
  title: string;
  name: string;
  email: string;
}

interface Props {
  initialContacts: TeamContact[];
}

export default function TeamContactsEditor({ initialContacts }: Props) {
  const t = useTranslations("admin.siteConfig");
  const tc = useTranslations("admin.common");

  const [contacts, setContacts] = useState<TeamContact[]>(initialContacts);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [form, setForm] = useState<TeamContact>({ title: "", name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<TeamContact>({ title: "", name: "", email: "" });

  async function persist(updated: TeamContact[]) {
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "teamContacts", value: JSON.stringify(updated) }),
      });
      if (res.ok) {
        setContacts(updated);
        setSuccess(true);
      } else {
        const d = (await res.json()) as { error?: string };
        setError(d.error ?? t("saveFailed"));
      }
    } catch {
      setError(t("networkError"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(idx: number) {
    setEditingIdx(idx);
    setForm({ ...contacts[idx] });
  }

  function saveEdit() {
    if (!form.title.trim() || !form.name.trim() || !form.email.trim()) return;
    const updated = contacts.map((c, i) => (i === editingIdx ? { ...form } : c));
    setEditingIdx(null);
    persist(updated);
  }

  function deleteContact(idx: number) {
    if (!confirm(t("confirmDeleteContact"))) return;
    persist(contacts.filter((_, i) => i !== idx));
  }

  function addContact() {
    if (!newForm.title.trim() || !newForm.name.trim() || !newForm.email.trim()) return;
    persist([...contacts, { ...newForm }]);
    setNewForm({ title: "", name: "", email: "" });
    setAddingNew(false);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: PRIMARY }}>
            {t("teamContactsTitle")}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{t("teamContactsHint")}</p>
        </div>
        {!addingNew && (
          <button
            onClick={() => { setAddingNew(true); setSuccess(false); }}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: PRIMARY, color: SECONDARY }}
          >
            {t("addContact")}
          </button>
        )}
      </div>

      {contacts.length === 0 && !addingNew && (
        <p className="text-sm text-gray-400">{t("noContacts")}</p>
      )}

      <div className="flex flex-col gap-2">
        {contacts.map((c, idx) => (
          <div
            key={idx}
            className="rounded-lg px-4 py-3"
            style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}
          >
            {editingIdx === idx ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">{t("contactFieldTitle")}</label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      autoFocus
                      className="border rounded px-2 py-1.5 text-sm focus:outline-none"
                      style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">{t("contactFieldName")}</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="border rounded px-2 py-1.5 text-sm focus:outline-none"
                      style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">{t("contactFieldEmail")}</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="border rounded px-2 py-1.5 text-sm focus:outline-none"
                      style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingIdx(null)}
                    className="text-xs px-3 py-1.5 rounded border"
                    style={{ borderColor: "#d1d5db", color: "#6b7280" }}
                  >
                    {tc("cancel")}
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 rounded font-semibold hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                  >
                    {saving ? tc("saving") : tc("save")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wide w-36 shrink-0" style={{ color: SECONDARY }}>
                    {c.title}
                  </span>
                  <span className="text-sm font-medium w-32 shrink-0" style={{ color: PRIMARY }}>{c.name}</span>
                  <span className="text-xs text-gray-400 truncate">{c.email}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEdit(idx)}
                    className="text-xs px-2.5 py-1 rounded border transition-all hover:opacity-80"
                    style={{ borderColor: PRIMARY, color: PRIMARY }}
                  >
                    {tc("edit")}
                  </button>
                  <button
                    onClick={() => deleteContact(idx)}
                    className="text-xs px-2.5 py-1 rounded border transition-all hover:opacity-80"
                    style={{ borderColor: "#ef4444", color: "#ef4444" }}
                  >
                    {tc("delete")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add new row */}
        {addingNew && (
          <div
            className="rounded-lg px-4 py-3"
            style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd" }}
          >
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">{t("contactFieldTitle")}</label>
                  <input
                    value={newForm.title}
                    onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
                    autoFocus
                    placeholder="e.g. President"
                    className="border rounded px-2 py-1.5 text-sm focus:outline-none"
                    style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">{t("contactFieldName")}</label>
                  <input
                    value={newForm.name}
                    onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm focus:outline-none"
                    style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">{t("contactFieldEmail")}</label>
                  <input
                    value={newForm.email}
                    onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
                    className="border rounded px-2 py-1.5 text-sm focus:outline-none"
                    style={{ borderColor: "#e5e7eb", color: PRIMARY }}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setAddingNew(false); setNewForm({ title: "", name: "", email: "" }); }}
                  className="text-xs px-3 py-1.5 rounded border"
                  style={{ borderColor: "#d1d5db", color: "#6b7280" }}
                >
                  {tc("cancel")}
                </button>
                <button
                  onClick={addContact}
                  disabled={saving}
                  className="text-xs px-3 py-1.5 rounded font-semibold hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY, color: SECONDARY }}
                >
                  {saving ? tc("saving") : tc("add")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          {t("contactSaved")}
        </p>
      )}
    </div>
  );
}
