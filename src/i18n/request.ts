/**
 * request.ts — next-intl 伺服器端設定
 *
 * 每次 Server Component 呼叫 useTranslations() 時，
 * next-intl 會透過此函式取得對應語言的訊息（messages）。
 *
 * 翻譯來源：messages/*.json 為基礎，SiteConfig key "i18n_overrides" 為覆寫層。
 * 管理員可透過 /admin/i18n 修改覆寫層，變更立即生效。
 */

import { getRequestConfig } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { routing } from "./routing";
import { db } from "@/lib/db";

type Messages = Record<string, unknown>;

function setNestedValue(obj: Messages, path: string, value: string): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null) cur[parts[i]] = {};
    cur = cur[parts[i]] as Messages;
  }
  cur[parts[parts.length - 1]] = value;
}

const getCachedOverrides = unstable_cache(
  async (): Promise<{ en: Record<string, string>; zh: Record<string, string> }> => {
    const record = await db.siteConfig.findUnique({ where: { key: "i18n_overrides" } });
    if (!record?.value) return { en: {}, zh: {} };
    const parsed = JSON.parse(record.value) as { en?: Record<string, string>; zh?: Record<string, string> };
    return { en: parsed.en ?? {}, zh: parsed.zh ?? {} };
  },
  ["i18n_overrides"],
  { tags: ["i18n_overrides"] }
);

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "zh" | "en")) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default as Messages;

  // Apply admin overrides stored in DB
  try {
    const overrides = await getCachedOverrides();
    const localeOverrides = overrides[locale as "en" | "zh"] ?? {};
    for (const [path, val] of Object.entries(localeOverrides)) {
      setNestedValue(messages, path, val);
    }
  } catch {
    // DB unavailable — use file defaults
  }

  return { locale, messages };
});
