import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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

const ROLE_LABEL: Record<Role, string> = {
  EXEC: "執行委員",
  SUPER_ADMIN: "超級管理員",
  ADMIN: "管理員",
  MEMBER: "成員",
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

interface MemberDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function MemberDetailPage({
  params,
}: MemberDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("members");

  const member = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      department: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!member) notFound();

  const deptSlug = member.department?.slug ?? "";
  const deptColor = DEPARTMENT_COLORS[deptSlug] ?? { bg: "#f3f4f6", text: "#374151" };
  const initials = getInitials(member.name);

  // Use locale-aware role label
  const roleLabel = locale === "zh"
    ? ROLE_LABEL[member.role]
    : member.role === Role.EXEC
    ? "Executive"
    : member.role === Role.SUPER_ADMIN
    ? "Super Admin"
    : member.role === Role.ADMIN
    ? "Admin"
    : "Member";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Banner */}
      <section
        className="px-4 py-14 sm:py-20"
        style={{ backgroundColor: PRIMARY }}
      >
        <div className="max-w-3xl mx-auto">
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

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar */}
            <div
              className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center
                         text-2xl font-bold tracking-wide select-none flex-shrink-0"
              style={
                member.image
                  ? { outline: `4px solid ${SECONDARY}44`, outlineOffset: "2px" }
                  : {
                      backgroundColor: `${SECONDARY}22`,
                      color: SECONDARY,
                      outline: `4px solid ${SECONDARY}44`,
                      outlineOffset: "2px",
                    }
              }
              aria-hidden="true"
            >
              {member.image ? (
                <Image
                  src={member.image}
                  alt={member.name}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col items-center sm:items-start gap-2 pb-1">
              <h1
                className="text-3xl sm:text-4xl font-bold"
                style={{ color: SECONDARY }}
              >
                {member.name}
              </h1>
              <p className="text-base font-medium" style={{ color: `${SECONDARY}bb` }}>
                {roleLabel}
              </p>
              {member.department && (
                <span
                  className="px-3 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: deptColor.bg, color: deptColor.text }}
                >
                  {member.department.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-6">
          {/* Back button */}
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
