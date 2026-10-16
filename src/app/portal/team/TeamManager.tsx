"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const PRIMARY = "#1a2744";

type Position = "PRESIDENT" | "VP" | "STAFF";

type Group = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  eventId: string | null;
  members: Array<{ id: string; position: Position; user: { id: string; name: string; email: string } }>;
};


async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export default function TeamManager() {
  const t = useTranslations("portal.teamPage");
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [canAppointVps, setCanAppointVps] = useState(false);
  const [error, setError] = useState("");

  const apply = useCallback((data: { groups: Group[]; canAppointVps: boolean }) => {
    setGroups(data.groups);
    setCanAppointVps(data.canAppointVps);
  }, []);

  // Refresh after a change.
  const load = useCallback(async () => {
    apply(await send("/api/team", "GET"));
  }, [apply]);

  useEffect(() => {
    let active = true;
    send("/api/team", "GET")
      .then((data) => active && apply(data))
      .catch((e) => active && setError(e instanceof Error ? e.message : t("loadError")));
    return () => {
      active = false;
    };
  }, [apply, t]);

  if (error && !groups) return <p className="mt-6 text-sm text-red-700">{error}</p>;
  if (!groups) return <p className="mt-6 text-sm text-gray-600">{t("loading")}</p>;
  if (groups.length === 0) {
    return <p className="mt-6 text-sm text-gray-600">{t("noGroups")}</p>;
  }

  // Show each group under its parent when the parent is also visible.
  const ids = new Set(groups.map((g) => g.id));
  const roots = groups.filter((g) => !g.parentId || !ids.has(g.parentId));
  const childrenOf = (id: string) => groups.filter((g) => g.parentId === id);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {roots.map((g) => (
        <GroupCard key={g.id} group={g} childrenOf={childrenOf} canAppointVps={canAppointVps} onChange={load} depth={0} />
      ))}
    </div>
  );
}

function GroupCard({
  group,
  childrenOf,
  canAppointVps,
  onChange,
  depth,
}: {
  group: Group;
  childrenOf: (id: string) => Group[];
  canAppointVps: boolean;
  onChange: () => Promise<void>;
  depth: number;
}) {
  const t = useTranslations("portal.teamPage");
  const positionLabel = (p: Position) => t(`position${p}`);
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState<Position>("STAFF");
  const [subgroupName, setSubgroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const isSubgroup = Boolean(group.parentId);
  const positions: Position[] = canAppointVps
    ? group.slug === "executive" ? ["PRESIDENT", "STAFF"] : ["VP", "STAFF"]
    : ["STAFF"];

  async function run(action: () => Promise<unknown>, done?: () => void) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      done?.();
      await onChange();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-2xl bg-white p-5 shadow-sm"
      style={{ border: "1px solid #e5e7eb", marginLeft: depth ? 16 : 0 }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold" style={{ color: PRIMARY }}>{group.name}</h2>
        {isSubgroup && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (confirm(t("archiveConfirm", { name: group.name }))) {
                void run(() => send(`/api/team/groups/${group.id}/archive`, "POST"));
              }
            }}
            className="text-xs text-gray-500 underline disabled:opacity-50"
          >
            {t("archive")}
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-gray-100">
        {group.members.length === 0 && <li className="py-2 text-sm text-gray-400">{t("noOne")}</li>}
        {group.members.map((m) => {
          const removable = m.position === "STAFF" || canAppointVps;
          return (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">{m.user.name || m.user.email}</p>
                <p className="truncate text-xs text-gray-500">{m.user.email} · {positionLabel(m.position)}</p>
              </div>
              {removable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (confirm(t("removeConfirm", { person: m.user.name || m.user.email, group: group.name }))) {
                      void run(() => send(`/api/team/members/${m.id}`, "DELETE"));
                    }
                  }}
                  className="shrink-0 text-xs text-red-700 underline disabled:opacity-50"
                >
                  {t("remove")}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => send("/api/team/members", "POST", { groupId: group.id, email, position }), () => setEmail(""));
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
        />
        {positions.length > 1 && (
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900"
          >
            {positions.map((p) => (
              <option key={p} value={p}>{positionLabel(p)}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: PRIMARY }}
        >
          {t("add")}
        </button>
      </form>

      {!group.eventId && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => send("/api/team/groups", "POST", { parentId: group.id, name: subgroupName }), () => setSubgroupName(""));
          }}
        >
          <input
            required
            value={subgroupName}
            onChange={(e) => setSubgroupName(e.target.value)}
            placeholder={t("subgroupPlaceholder")}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
          >
            {t("create")}
          </button>
        </form>
      )}

      {message && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}

      {childrenOf(group.id).map((child) => (
        <div key={child.id} className="mt-4">
          <GroupCard group={child} childrenOf={childrenOf} canAppointVps={canAppointVps} onChange={onChange} depth={depth + 1} />
        </div>
      ))}
    </section>
  );
}
