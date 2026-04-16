/**
 * routing.ts — next-intl 路由設定
 *
 * 定義支援的語言（locales）和預設語言（defaultLocale）。
 * 所有頁面路由都會以 /[locale]/ 為前綴。
 */

import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  /** 支援的語言清單 */
  locales: ["zh", "en"],

  /** 預設語言：繁體中文 */
  defaultLocale: "zh",
});
