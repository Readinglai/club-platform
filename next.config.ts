/**
 * next.config.ts — Next.js 設定
 *
 * 整合 next-intl plugin，讓 next-intl 能夠：
 * 1. 自動將 src/i18n/request.ts 連結到每個 request 的翻譯載入邏輯
 * 2. 在 build 時進行型別安全檢查
 *
 * createNextIntlPlugin 接受 request.ts 的路徑，
 * 預設為 ./src/i18n/request.ts，可省略參數。
 */

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// 建立 next-intl plugin，指定 request 設定檔路徑
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
