import Link from "next/link";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicTeam, type TeamPerson } from "@/lib/team/public";

export const dynamic = "force-dynamic";

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (/[一-鿿]/.test(trimmed)) return trimmed.slice(0, 2);
  return trimmed
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

interface MembersPageProps {
  params: Promise<{ locale: string }>;
}

/** The club's team: everyone holding a position, by department (src/lib/team/public.ts). */
export default async function MembersPage({ params }: MembersPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("members");
  const departments = await getPublicTeam();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      <section className="px-4 py-16 text-center sm:py-24" style={{ backgroundColor: PRIMARY }}>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
          <h1 className="text-5xl font-black leading-tight sm:text-7xl" style={{ color: SECONDARY }}>
            {t("title")}
          </h1>
          <div className="h-0.5 w-14 rounded-full" style={{ backgroundColor: `${SECONDARY}66` }} />
          <p className="text-base sm:text-lg" style={{ color: `${SECONDARY}88` }}>{t("subtitle")}</p>
        </div>
      </section>

      <div className="mx-auto flex max-w-4xl flex-col gap-14 px-4 py-12">
        {departments.map((dept) => (
          <section key={dept.slug} aria-labelledby={`dept-${dept.slug}`}>
            <div className="flex items-center gap-3">
              <h2 id={`dept-${dept.slug}`} className="text-2xl font-extrabold" style={{ color: PRIMARY }}>
                {t(`dept_${dept.slug}`)}
              </h2>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ backgroundColor: `${SECONDARY}33`, color: PRIMARY }}>
                {dept.people.length}
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: `${PRIMARY}18` }} />
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {dept.people.map((person) => (
                <PersonCard key={person.id} person={person} locale={locale} positionLabel={t(`position_${person.position}`)} viewLabel={t("viewProfileOf", { name: person.name })} />
              ))}
            </div>
          </section>
        ))}

        {departments.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <p className="text-lg">{t("noMembers")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonCard({ person, locale, positionLabel, viewLabel }: { person: TeamPerson; locale: string; positionLabel: string; viewLabel: string }) {
  return (
    <Link
      href={`/${locale}/members/${person.id}`}
      className="group flex items-center gap-5 rounded-2xl border bg-white p-5 transition-shadow hover:shadow-lg"
      style={{ borderColor: "#e5e7eb" }}
      aria-label={viewLabel}
    >
      <div
        className="flex h-20 w-20 shrink-0 select-none items-center justify-center overflow-hidden rounded-full text-xl font-black"
        style={person.image ? {} : { backgroundColor: PRIMARY, color: SECONDARY }}
        aria-hidden="true"
      >
        {person.image ? <Image src={person.image} alt="" width={80} height={80} className="h-full w-full object-cover" /> : getInitials(person.name)}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="truncate text-lg font-bold" style={{ color: PRIMARY }}>{person.name}</h3>
        <span className="self-start rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: SECONDARY, color: PRIMARY }}>
          {person.title ?? `${positionLabel}${person.group ? ` · ${person.group}` : ""}`}
        </span>
        {person.major && <span className="text-sm text-gray-600">{person.major}</span>}
        {person.bio && <p className="line-clamp-2 text-sm text-gray-500">{person.bio}</p>}
      </div>
    </Link>
  );
}
