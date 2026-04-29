/**
 * app/[locale]/members/page.tsx — 成員列表頁（Async Server Component）
 *
 * 顯示所有社團成員卡片，按職位層級（exec → team_lead → member）排序。
 * 每張卡片包含：頭像（姓名縮寫圓形佔位）、姓名、職位、所屬 team。
 * 點擊卡片跳轉到個人介紹頁 /[locale]/members/[id]。
 *
 * ⚠️ async Server Component 使用 getTranslations（非 useTranslations hook）
 *
 * 主題色：primary #1a2744、secondary #c9b99a
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getAllMembers,
  DEPARTMENT_LABELS,
  type Member,
  type MemberRole,
} from "@/lib/data/members";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

// ─── 部門色票（區分不同部門的視覺標籤） ─────────────────────────────────────

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string }> = {
  event: { bg: "#dbeafe", text: "#1e40af" },
  marketing: { bg: "#fce7f3", text: "#9d174d" },
  operation: { bg: "#d1fae5", text: "#065f46" },
};

// ─── 頭像：以姓名首字縮寫製作圓形佔位頭像 ───────────────────────────────────

/**
 * getInitials — 從姓名取得縮寫
 * 中文姓名取前兩字；英文姓名取 First + Last 首字母
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  // 判斷是否含中文字元
  if (/[\u4e00-\u9fff]/.test(trimmed)) {
    return trimmed.slice(0, 2);
  }
  // 英文：取每個單字首字母，最多 2 個
  return trimmed
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

// ─── 單張成員卡片 ──────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: Member;
  locale: string;
}

const ROLE_I18N_KEY: Record<MemberRole, "roleExec" | "roleTeamLead" | "roleMember" | "roleSuperAdmin"> = {
  exec: "roleExec",
  team_lead: "roleTeamLead",
  member: "roleMember",
  super_admin: "roleSuperAdmin",
};

function MemberCard({ member, locale }: MemberCardProps) {
  const t = useTranslations("members");
  const departmentColor = DEPARTMENT_COLORS[member.department] ?? {
    bg: "#f3f4f6",
    text: "#374151",
  };
  const initials = getInitials(member.name);
  // 簡介截斷至 80 字元
  const shortBio = member.bio.slice(0, 80) + (member.bio.length > 80 ? "…" : "");

  return (
    <Link
      href={`/${locale}/members/${member.id}`}
      className="group flex flex-col items-center gap-4 p-6 rounded-2xl border bg-white
                 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderColor: "#e5e7eb" }}
      aria-label={t("viewProfileOf", { name: member.name })}
    >
      {/* ── 頭像 ── */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center
                   text-lg font-bold tracking-wide select-none flex-shrink-0"
        style={{ backgroundColor: PRIMARY, color: SECONDARY }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* ── 姓名 ── */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h2
          className="text-base font-bold group-hover:opacity-80 transition-opacity"
          style={{ color: PRIMARY }}
        >
          {member.name}
        </h2>

        {/* 職位 */}
        <p className="text-sm font-medium" style={{ color: `${PRIMARY}99` }}>
          {t(ROLE_I18N_KEY[member.role])}
        </p>
      </div>

      {/* ── 部門標籤 ── */}
      <span
        className="px-3 py-0.5 rounded-full text-xs font-semibold"
        style={{ backgroundColor: departmentColor.bg, color: departmentColor.text }}
      >
        {DEPARTMENT_LABELS[member.department]}
      </span>

      {/* ── 簡介摘要 ── */}
      <p className="text-xs text-gray-500 text-center leading-relaxed line-clamp-3">
        {shortBio}
      </p>

      {/* ── 查看更多指示 ── */}
      <span
        className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: SECONDARY }}
      >
        {t("viewProfile")} →
      </span>
    </Link>
  );
}

// ─── 頁面主元件 ───────────────────────────────────────────────────────────────

interface MembersPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("members");
  const members = getAllMembers();

  // 依職位分組（exec 優先，其餘按原順序）
  const execMembers = members.filter((m) => m.role === "exec" || m.role === "super_admin");
  const leadMembers = members.filter((m) => m.role === "team_lead");
  const generalMembers = members.filter((m) => m.role === "member");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* ── 頁首 Banner ── */}
      <section
        className="px-4 py-16 sm:py-20 text-center"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1
            className="text-4xl sm:text-5xl font-bold tracking-wide"
            style={{ color: SECONDARY }}
          >
            {t("title")}
          </h1>
          <div
            className="w-12 h-0.5 rounded-full"
            style={{ backgroundColor: `${SECONDARY}88` }}
          />
          <p className="text-base" style={{ color: `${SECONDARY}99` }}>
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* ── 成員卡片區 ── */}
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-12">

        {/* 執行委員 */}
        {execMembers.length > 0 && (
          <section aria-label={t("exec")}>
            <SectionTitle
              label={t("exec")}
              count={execMembers.length}
              color={PRIMARY}
              accent={SECONDARY}
            />
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6">
              {execMembers.map((m) => (
                <MemberCard key={m.id} member={m} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Team Leads */}
        {leadMembers.length > 0 && (
          <section aria-label={t("teamLead")}>
            <SectionTitle
              label={t("teamLead")}
              count={leadMembers.length}
              color={PRIMARY}
              accent={SECONDARY}
            />
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6">
              {leadMembers.map((m) => (
                <MemberCard key={m.id} member={m} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* 一般成員 */}
        {generalMembers.length > 0 && (
          <section aria-label={t("general")}>
            <SectionTitle
              label={t("general")}
              count={generalMembers.length}
              color={PRIMARY}
              accent={SECONDARY}
            />
            <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6">
              {generalMembers.map((m) => (
                <MemberCard key={m.id} member={m} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── 分組標題元件 ────────────────────────────────────────────────────────────

interface SectionTitleProps {
  label: string;
  count: number;
  color: string;
  accent: string;
}

function SectionTitle({ label, count, color, accent }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xl font-bold" style={{ color }}>
        {label}
      </h2>
      {/* 人數 badge */}
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${accent}33`, color }}
      >
        {count}
      </span>
      {/* 底線裝飾 */}
      <div
        className="flex-1 h-px"
        style={{ backgroundColor: `${color}22` }}
      />
    </div>
  );
}
