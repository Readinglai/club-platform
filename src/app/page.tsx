/**
 * app/page.tsx — 根路由佔位頁
 *
 * 這個頁面理論上不會被直接訪問，因為 middleware.ts 會將所有
 * 沒有 locale 前綴的請求（包含 /）重導向到 /zh/ 或 /en/。
 *
 * 但作為防禦性設計，若 middleware 未生效，此頁直接重導向到預設語言首頁。
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  // 重導向到預設語言（zh）首頁
  redirect("/zh");
}
