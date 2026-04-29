import { requireAuth } from "@/lib/auth/guard";
import { getTranslations } from "next-intl/server";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";
import I18nEditor from "./I18nEditor";

type Messages = Record<string, unknown>;

function flattenMessages(obj: Messages, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") {
      result[path] = val;
    } else if (typeof val === "object" && val !== null) {
      Object.assign(result, flattenMessages(val as Messages, path));
    }
  }
  return result;
}

function setNestedValue(obj: Messages, path: string, value: string): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]] as Messages;
  }
  cur[parts[parts.length - 1]] = value;
}

function applyOverrides(base: Messages, overrides: Record<string, string>): Messages {
  const clone = JSON.parse(JSON.stringify(base)) as Messages;
  for (const [path, value] of Object.entries(overrides)) setNestedValue(clone, path, value);
  return clone;
}

function getNamespaceKey(path: string): string {
  const parts = path.split(".");
  // admin.* sub-namespaces: take first 2 parts
  if (parts[0] === "admin" && parts.length >= 3) return `${parts[0]}.${parts[1]}`;
  return parts[0];
}

export default async function I18nPage() {
  await requireAuth(4);
  const t = await getTranslations("admin.i18n");

  const enBase = JSON.parse(
    readFileSync(join(process.cwd(), "messages", "en.json"), "utf-8")
  ) as Messages;
  const zhBase = JSON.parse(
    readFileSync(join(process.cwd(), "messages", "zh.json"), "utf-8")
  ) as Messages;

  let overrides: { en: Record<string, string>; zh: Record<string, string> } = { en: {}, zh: {} };
  try {
    const record = await db.siteConfig.findUnique({ where: { key: "i18n_overrides" } });
    if (record?.value) overrides = JSON.parse(record.value) as typeof overrides;
  } catch { /* use empty overrides */ }

  const enFlat = flattenMessages(applyOverrides(enBase, overrides.en ?? {}));
  const zhFlat = flattenMessages(applyOverrides(zhBase, overrides.zh ?? {}));

  // Group paths by namespace
  const nsMap = new Map<string, { path: string; en: string; zh: string }[]>();
  for (const path of Object.keys(enFlat)) {
    const ns = getNamespaceKey(path);
    if (!nsMap.has(ns)) nsMap.set(ns, []);
    nsMap.get(ns)!.push({ path, en: enFlat[path] ?? "", zh: zhFlat[path] ?? "" });
  }

  const namespaces = Array.from(nsMap.entries()).map(([ns, entries]) => ({ ns, entries }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#1a2744" }}>{t("title")}</h1>
        <p className="text-sm text-gray-500 mt-1">{t("subtitle")}</p>
      </div>
      <I18nEditor namespaces={namespaces} />
    </div>
  );
}
