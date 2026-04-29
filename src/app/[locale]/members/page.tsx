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
        <h2
          className="text-base font-bold group-hover:opacity-80 transition-opacity"
          style={{ color: PRIMARY }}
        >
          {member.name}
        </h2>
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

      {/* View profile hint */}
      <span
        className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: SECONDARY }}
      >
        {t("viewProfile")} →
      </span>
    </Link>
  );
}

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

      {/* Members grid */}
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col gap-12">
        {/* Executive section */}
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

        {/* General members section */}
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

        {members.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">{t("noMembers")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: `${accent}33`, color }}
      >
        {count}
      </span>
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}22` }} />
    </div>
  );
}
