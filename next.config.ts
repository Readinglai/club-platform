/**
 * next.config.ts — Next.js 設定
 *
 * 整合 next-intl plugin，讓 next-intl 能夠：
 * 1. 自動將 src/i18n/request.ts 連結到每個 request 的翻譯載入邏輯
 * 2. 在 build 時進行型別安全檢查
 *
 * createNextIntlPlugin 接受 request.ts 的路徑，
 * 預設為 ./src/i18n/request.ts，可省略參數。
 *
 * CORS 設定：
 * headers() 在 Vercel CDN 層套用 CORS headers，覆蓋所有 /api/* 路由。
 * App 使用 Authorization: Bearer token（非 credentials: include），
 * 可安全使用 * wildcard。middleware.ts 負責動態 origin 白名單檢查。
 */

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// 建立 next-intl plugin，指定 request 設定檔路徑
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "rbwchvwiuazfrsoabwni.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  /**
   * CORS headers：在 CDN 層對所有 /api/* 路由加入 CORS 設定。
   * OPTIONS preflight 由此處靜態 headers 處理，不依賴 middleware。
   * App 使用 JWT（非 cookie），可用 wildcard origin。
   */
  async headers() {
    return [
      {
        // 套用到所有 /api/* 路由
        source: "/api/:path*",
        headers: [
          // 允許任何 origin（JWT 模式無 credentials: include，可用 *）
          { key: "Access-Control-Allow-Origin", value: "*" },
          // 允許的 HTTP 方法
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          },
          // 允許的 request headers（含 Authorization 用於 JWT）
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          // preflight 結果快取時間（秒）
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
