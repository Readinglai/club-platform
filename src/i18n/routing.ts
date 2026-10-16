/**
 * routing.ts — next-intl 路由設定
 *
 * 定義支援的語言（locales）和預設語言（defaultLocale）。
 * 所有頁面路由都會以 /[locale]/ 為前綴。
 */

import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
  // The public site takes its language from the address only. The cookie is
  // the portal's language choice (set by its language switch), so visiting
  // an English page such as /login must not overwrite it.
  localeCookie: false,
});
