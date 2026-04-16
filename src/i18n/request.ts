/**
 * request.ts — next-intl 伺服器端設定
 *
 * 每次 Server Component 呼叫 useTranslations() 時，
 * next-intl 會透過此函式取得對應語言的訊息（messages）。
 *
 * getRequestConfig 會在每個 request 執行，
 * 根據 routing 設定的 locale 動態載入對應的 JSON 訊息檔。
 */

import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale 是從 URL 參數 [locale] 解析出來的語言碼
  let locale = await requestLocale;

  // 確保 locale 有效，若無效則回退至預設語言
  if (!locale || !routing.locales.includes(locale as "zh" | "en")) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // 動態載入對應語言的訊息 JSON
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
