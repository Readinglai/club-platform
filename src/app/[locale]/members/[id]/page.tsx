/**
 * app/[locale]/members/[id]/page.tsx — 成員個人介紹頁（Async Server Component）
 *
 * 動態路由：根據 URL 中的 [id] 參數從假資料查找對應成員。
 * 找不到成員時呼叫 notFound() 回傳 404。
 *
 * 顯示完整成員資訊：
 * - 大頭像（姓名縮寫圓形）
 * - 姓名、職位、所屬 team
 * - 個人簡介段落
 * - 返回成員列表連結
 *
 * ⚠️ async Server Component 使用 getTranslations（非 useTranslations hook）
 *
 * TODO: 替換假資料查詢為 Prisma，並加入社群媒體連結欄位（Module 1.3.2 完整版）
 * 主題色：primary #1a2744、secondary #c9b99a
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  getMemberById,
  getAllMembers,
  ROLE_LABELS,
  DEPARTMENT_LABELS,
} from "@/lib/data/members";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// 部門色票（與列表頁一致）
const DEPARTMENT_COLORS: Record<string, { bg: string; text: string }> = {
  event: { bg: "#dbeafe", text: "#1e40af" },
  marketing: { bg: "#fce7f3", text: "#9d174d" },
  operation: { bg: "#d1fae5", text: "#065f46" },
};

// ─── 靜態路徑預生成 ──────────────────────────────────────────────────────────

/**
 * generateStaticParams — 為每位成員預先生成靜態路徑
 * TODO: 接資料庫後改為非同步 Prisma 查詢
 */
export async function generateStaticParams() {
  const members = getAllMembers();
  const locales = ["zh", "en"];
  return locales.flatMap((locale) =>
    members.map((m) => ({ locale, id: m.id }))
  );
}

// ─── 縮寫工具（與列表頁一致） ────────────────────────────────────────────────

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (/[\u4e00-\u9fff]/.test(trimmed)) return trimmed.slice(0, 2);
  return trimmed
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface MemberDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("members");

  // 查找成員；找不到則 404
  const member = getMemberById(id);
  if (!member) notFound();

  const departmentColor = DEPARTMENT_COLORS[member.department] ?? { bg: "#f3f4f6", text: "#374151" };
  const initials = getInitials(member.name);

  // 將簡介依段落分割（\n\n）
  const bioParagraphs = member.bio
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* ── 頁首 Banner ── */}
      <section
        className="px-4 py-14 sm:py-20"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-3xl mx-auto">
          {/* 麵包屑 */}
          <nav className="flex items-center gap-2 text-sm mb-8" aria-label="麵包屑">
            <Link
              href={`/${locale}/members`}
              className="transition-opacity hover:opacity-70"
              style={{ color: `${SECONDARY}99` }}
            >
              {t("title")}
            </Link>
            <span style={{ color: `${SECONDARY}44` }}>/</span>
            <span style={{ color: `${SECONDARY}77` }}>{member.name}</span>
          </nav>

          {/* 頭像 + 姓名 + 標籤 */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* 大頭像 */}
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center
                         text-2xl font-bold tracking-wide select-none flex-shrink-0"
              style={{
                backgroundColor: `${SECONDARY}22`,
                color: SECONDARY,
                outline: `4px solid ${SECONDARY}44`,
                outlineOffset: "2px",
              }}
              aria-hidden="true"
            >
              {initials}
            </div>

            {/* 文字資訊 */}
            <div className="flex flex-col items-center sm:items-start gap-2 pb-1">
              <h1
                className="text-3xl sm:text-4xl font-bold"
                style={{ color: SECONDARY }}
              >
                {member.name}
              </h1>
              <p className="text-base font-medium" style={{ color: `${SECONDARY}bb` }}>
                {ROLE_LABELS[member.role]}
              </p>
              {/* 部門標籤 */}
              <span
                className="px-3 py-0.5 rounded-full text-xs font-semibold"
                style={{ backgroundColor: departmentColor.bg, color: departmentColor.text }}
              >
                {DEPARTMENT_LABELS[member.department]}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 主要內容區 ── */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-6">
          {/* 個人簡介卡 */}
          <div
            className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
            style={{ border: "1px solid #e5e7eb" }}
          >
            <h2
              className="text-base font-semibold mb-4"
              style={{ color: PRIMARY }}
            >
              {t("bioTitle")}
            </h2>

            <div className="flex flex-col gap-3">
              {bioParagraphs.map((para, idx) => (
                <p
                  key={idx}
                  className="text-sm text-gray-600 leading-relaxed"
                >
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* TODO: 社群媒體連結卡（Module 1.3.2 完整版補充） */}
          {/* TODO: 出席記錄（Module 2.1.4，需登入才能查看自己的記錄） */}

          {/* 返回按鈕 */}
          <div>
            <Link
              href={`/${locale}/members`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                         text-sm font-medium border transition-all hover:opacity-80"
              style={{ borderColor: PRIMARY, color: PRIMARY }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t("backToList")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
