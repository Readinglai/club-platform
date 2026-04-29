/**
 * /api/admin/i18n
 *
 * GET  — 回傳所有翻譯（檔案預設值 + DB 覆寫合併後）
 * PATCH — 儲存指定路徑的翻譯覆寫至 SiteConfig（key: i18n_overrides）
 *
 * 需要 ADMIN（level 4）以上權限。
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { readFileSync } from "fs";
import { join } from "path";
import { requireAuthJson } from "@/lib/auth/guard";
import { db } from "@/lib/db";

type Messages = Record<string, unknown>;
type Overrides = { en: Record<string, string>; zh: Record<string, string> };

function readBaseMessages(locale: string): Messages {
  return JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf-8")
  ) as Messages;
}

function setNestedValue(obj: Messages, path: string, value: string): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]] as Messages;
  }
  cur[parts[parts.length - 1]] = value;
}

function applyOverrides(base: Messages, overrides: Record<string, string>): Messages {
  const clone = JSON.parse(JSON.stringify(base)) as Messages;
  for (const [path, value] of Object.entries(overrides)) {
    setNestedValue(clone, path, value);
  }
  return clone;
}

async function loadOverrides(): Promise<Overrides> {
  try {
    const record = await db.siteConfig.findUnique({ where: { key: "i18n_overrides" } });
    if (record?.value) {
      const parsed = JSON.parse(record.value) as Overrides;
      return { en: parsed.en ?? {}, zh: parsed.zh ?? {} };
    }
  } catch { /* DB unavailable */ }
  return { en: {}, zh: {} };
}

export async function GET(request: NextRequest) {
  const guard = await requireAuthJson(4, request);
  if (guard.error) return guard.error;

  const overrides = await loadOverrides();
  const en = applyOverrides(readBaseMessages("en"), overrides.en);
  const zh = applyOverrides(readBaseMessages("zh"), overrides.zh);

  return NextResponse.json({ en, zh });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAuthJson(4, request);
  if (guard.error) return guard.error;

  const body = (await request.json()) as { locale?: unknown; path?: unknown; value?: unknown };
  const { locale, path, value } = body;

  if (locale !== "en" && locale !== "zh") {
    return NextResponse.json({ error: "locale must be en or zh" }, { status: 400 });
  }
  if (typeof path !== "string" || !path.trim()) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  if (typeof value !== "string") {
    return NextResponse.json({ error: "value must be a string" }, { status: 400 });
  }

  const overrides = await loadOverrides();
  overrides[locale][path] = value;

  await db.siteConfig.upsert({
    where: { key: "i18n_overrides" },
    create: { key: "i18n_overrides", value: JSON.stringify(overrides) },
    update: { value: JSON.stringify(overrides) },
  });

  revalidateTag("i18n_overrides", {});

  return NextResponse.json({ ok: true });
}
