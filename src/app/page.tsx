/**
 * page.tsx — 首頁（Server Component）
 *
 * ROCSAUT 社團管理平台的對外首頁。
 * 點擊「進入平台」導向 /login 頁面。
 * 主色調：#1a2744（深藍）、#c9b99a（米色）
 */

import Link from "next/link";

export default function HomePage() {
  return (
    /* 全螢幕置中容器，深藍背景 */
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "#1a2744" }}
    >
      {/* 主卡片 */}
      <div className="flex flex-col items-center gap-8 text-center">

        {/* 社團名稱 */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-5xl font-bold tracking-[0.2em]"
            style={{ color: "#c9b99a" }}
          >
            ROCSAUT
          </h1>
          {/* 副標題 */}
          <p className="text-base tracking-wide" style={{ color: "#c9b99a99" }}>
            社團管理平台
          </p>
        </div>

        {/* 裝飾分隔線 */}
        <div
          className="w-16 h-px"
          style={{ backgroundColor: "#c9b99a66" }}
        />

        {/* 簡短說明 */}
        <p className="text-sm leading-relaxed max-w-xs" style={{ color: "#c9b99acc" }}>
          成員管理、活動報名、任務追蹤——<br />
          一站式社團行政系統。
        </p>

        {/* 進入平台按鈕 */}
        <Link
          href="/login"
          className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{ backgroundColor: "#c9b99a", color: "#1a2744" }}
        >
          進入平台
        </Link>
      </div>

      {/* 頁腳 */}
      <p
        className="absolute bottom-6 text-xs"
        style={{ color: "#c9b99a55" }}
      >
        © {new Date().getFullYear()} ROCSAUT
      </p>
    </div>
  );
}
