"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default function NewTaskGroupPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? "zh";
  const t = useTranslations("admin.taskGroups");
  const tc = useTranslations("admin.common");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/exec/task-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? tc("createFailed"));
        return;
      }

      const taskGroup = await res.json();
      router.push(`/${locale}/admin/task-groups/${taskGroup.id}`);
    } catch {
      setError(tc("networkErrorRetry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link
          href={`/${locale}/admin/task-groups`}
          className="text-xs hover:opacity-70"
          style={{ color: SECONDARY }}
        >
          {t("backToList")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-8" style={{ color: PRIMARY }}>
        {t("newTitle")}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border p-6 shadow-sm flex flex-col gap-5"
        style={{ borderColor: `${SECONDARY}44`, backgroundColor: "white" }}
      >
        <div>
          <label
            htmlFor="name"
            className="block text-xs font-semibold mb-1.5"
            style={{ color: PRIMARY }}
          >
            {t("fieldName")}
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
            required
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
            style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-xs font-semibold mb-1.5"
            style={{ color: PRIMARY }}
          >
            {t("fieldDescription")}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descPlaceholder")}
            rows={3}
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 resize-none"
            style={{ borderColor: `${SECONDARY}55`, color: PRIMARY }}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        >
          {loading ? t("creating") : t("createGroupButton")}
        </button>
      </form>
    </div>
  );
}
