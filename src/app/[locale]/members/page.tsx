import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { Role } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

const DEPARTMENT_COLORS: Record<string, { bg: string; text: string }> = {
  event: { bg: "#dbeafe", text: "#1e40af" },
  marketing: { bg: "#fce7f3", text: "#9d174d" },
  operation: { bg: "#d1fae5", text: "#065f46" },
};

type DbUser = {
  id: string;
  name: string;
  image: string | null;
  role: Role;
  bio: string | null;
  major: string | null;
  department: { id: string; name: string; slug: string } | null;
};

const ROLE_I18N_KEY: Record<Role, "roleExec" | "roleSuperAdmin" | "roleAdmin" | "roleMember"> = {
  EXEC: "roleExec",
  SUPER_ADMIN: "roleSuperAdmin",
  ADMIN: "roleAdmin",
  MEMBER: "roleMember",
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (/[一-鿿]/.test(trimmed)) return trimmed.slice(0, 2);
  return trimmed
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

// ─── Exec Row (horizontal, large avatar) ─────────────────────────────────────

interface ExecRowProps {
  member: DbUser;
  locale: string;
}

function ExecRow({ member, locale }: ExecRowProps) {
  const t = useTranslations("members");
  const deptSlug = member.department?.slug ?? "";
  const deptColor = DEPARTMENT_COLORS[deptSlug] ?? { bg: "#f3f4f6", text: "#374151" };
  const initials = getInitials(member.name);

  return (
    <Link
      href={`/${locale}/members/${member.id}`}
      className="group flex items-center gap-6 p-5 sm:p-6 rounded-2xl border bg-white
                 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
      style={{ borderColor: "#e5e7eb" }}
      aria-label={t("viewProfileOf", { name: member.name })}
    >
      {/* 128px circular avatar */}
      <div
        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden flex items-center justify-center
                   text-xl sm:text-2xl font-black tracking-wide select-none flex-shrink-0"
        style={member.image ? {} : { backgroundColor: PRIMARY, color: SECONDARY }}
        aria-hidden="true"
      >
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            width={128}
            height={128}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <h3
          className="text-xl sm:text-2xl font-bold leading-tight truncate group-hover:opacity-80 transition-opacity"
          style={{ color: PRIMARY }}
        >
          {member.name}
        </h3>

        {/* Role badge */}
        <span
          className="inline-block self-start text-xs font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: SECONDARY, color: PRIMARY }}
        >
          {t(ROLE_I18N_KEY[member.role])}
        </span>

        {/* Department */}
        {member.department && (
          <span
            className="inline-block self-start text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: deptColor.bg, color: deptColor.text }}
          >
            {member.department.name}
          </span>
        )}

        {/* Bio (line-clamp to 2 lines) */}
        {member.bio && (
          <p
            className="text-sm leading-relaxed line-clamp-2 mt-0.5"
            style={{ color: "#777" }}
          >
            {member.bio}
          </p>
        )}
      </div>

      {/* Arrow hint */}
      <span
        className="text-sm font-semibold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: SECONDARY }}
        aria-hidden="true"
      >
        →
      </span>
    </Link>
  );
}

// ─── General Member Card (grid card, unchanged layout) ───────────────────────

interface MemberCardProps {
  member: DbUser;
  locale: string;
}

function MemberCard({ member, locale }: MemberCardProps) {
  const t = useTranslations("members");
  const deptSlug = member.department?.slug ?? "";
  const deptColor = DEPARTMENT_COLORS[deptSlug] ?? { bg: "#f3f4f6", text: "#374151" };
  const initials = getInitials(member.name);

  return (
    <Link
      href={`/${locale}/members/${member.id}`}
      className="group flex flex-col items-center gap-4 p-6 rounded-2xl border bg-white
                 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ borderColor: "#e5e7eb" }}
      aria-label={t("viewProfileOf", { name: member.name })}
    >
      {/* Avatar */}
      <div
        className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center
                   text-lg font-bold tracking-wide select-none flex-shrink-0"
        style={member.image ? {} : { backgroundColor: PRIMARY, color: SECONDARY }}
        aria-hidden="true"
      >
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>

      {/* Name + role */}
      <div className="flex flex-col items-center gap-1 text-center">
        <h3
          className="text-base font-bold group-hover:opacity-80 transition-opacity"
          style={{ color: PRIMARY }}
        >
          {member.name}
        </h3>
        <p className="text-sm font-medium" style={{ color: `${PRIMARY}99` }}>
          {t(ROLE_I18N_KEY[member.role])}
        </p>
      </div>

      {/* Department badge */}
      {member.department && (
        <span
          className="px-3 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: deptColor.bg, color: deptColor.text }}
        >
          {member.department.name}
        </span>
      )}

      <span
        className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: SECONDARY }}
      >
        {t("viewProfile")} →
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface MembersPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MembersPage({ params }: MembersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("members");

  const members = await db.user.findMany({
    where: { role: { in: [Role.EXEC, Role.MEMBER] } },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      bio: true,
      major: true,
      department: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { name: "asc" },
  });

  const execMembers = members.filter((m) => m.role === Role.EXEC);
  const generalMembers = members.filter((m) => m.role === Role.MEMBER);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Banner */}
      <section
        className="px-4 py-16 sm:py-24 text-center"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1
            className="text-5xl sm:text-7xl font-black leading-tight"
            style={{ color: SECONDARY }}
          >
            {t("title")}
          </h1>
          <div
            className="w-14 h-0.5 rounded-full"
            style={{ backgroundColor: `${SECONDARY}66` }}
          />
          <p className="text-base sm:text-lg" style={{ color: `${SECONDARY}88` }}>
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Members list */}
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-14">
        {/* Executive section — horizontal rows */}
        {execMembers.length > 0 && (
          <section aria-label={t("exec")}>
            <SectionTitle
              label={t("exec")}
              count={execMembers.length}
              color={PRIMARY}
              accent={SECONDARY}
            />
            <div className="flex flex-col gap-4 mt-6">
              {execMembers.map((m) => (
                <ExecRow key={m.id} member={m} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* General members section — card grid */}
        {generalMembers.length > 0 && (
          <section aria-label={t("general")}>
            <SectionTitle
              label={t("general")}
              count={generalMembers.length}
              color={PRIMARY}
              accent={SECONDARY}
            />
            <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 mt-6">
              {generalMembers.map((m) => (
                <MemberCard key={m.id} member={m} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {members.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">{t("noMembers")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

interface SectionTitleProps {
  label: string;
  count: number;
  color: string;
  accent: string;
}

function SectionTitle({ label, count, color, accent }: SectionTitleProps) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-2xl font-extrabold" style={{ color }}>
        {label}
      </h2>
      <span
        className="text-xs font-bold px-2.5 py-0.5 rounded-full"
        style={{ backgroundColor: `${accent}33`, color }}
      >
        {count}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}18` }} />
    </div>
  );
}
