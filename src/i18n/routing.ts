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
});
