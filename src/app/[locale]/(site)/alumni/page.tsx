import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import AlumniPhotoCard from "./AlumniPhotoCard";

export const dynamic = "force-dynamic";

const PRIMARY   = "#1a2744";
const SECONDARY = "#c9b99a";

interface AlumniItem {
  id: string;
  name: string;
  graduationYear: number | null;
  position: string | null;
  department: string | null;
  photoUrl: string | null;
}

interface AlumniPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AlumniPage({ params }: AlumniPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("alumni");

  const baseUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  let alumniList: AlumniItem[] = [];
  try {
    const res = await fetch(`${baseUrl}/api/alumni`, { cache: "no-store" });
    if (res.ok) alumniList = (await res.json()) as AlumniItem[];
  } catch {
    alumniList = [];
  }

  const years = [...new Set(
    alumniList
      .map((a) => a.graduationYear)
      .filter((y): y is number => y !== null)
  )].sort((a, b) => b - a);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Hero */}
      <section className="px-4 py-16 sm:py-20 text-center" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-wide" style={{ color: SECONDARY }}>
            {t("title")}
          </h1>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: `${SECONDARY}88` }} />
          <p className="text-base" style={{ color: `${SECONDARY}99` }}>
            {t("subtitle")}
          </p>
          <div className="flex items-center gap-8 mt-2">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold" style={{ color: SECONDARY }}>
                {alumniList.length}
              </span>
              <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>
                {t("totalAlumni")}
              </span>
            </div>
            {years.length > 0 && (
              <>
                <div className="w-px h-10" style={{ backgroundColor: `${SECONDARY}44` }} />
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-bold" style={{ color: SECONDARY }}>
                    {years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : years[0]}
                  </span>
                  <span className="text-xs mt-0.5" style={{ color: `${SECONDARY}88` }}>
                    {t("yearSpan")}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        {alumniList.length === 0 ? (
          <p className="text-center text-gray-400 py-20">{t("noAlumni")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {alumniList.map((alumni) => (
              <Link
                key={alumni.id}
                href={`/${locale}/alumni/${alumni.id}`}
                className="group flex flex-col rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-shadow duration-200"
              >
                {/* Avatar area */}
                <div className="h-44 overflow-hidden">
                  <AlumniPhotoCard photoUrl={alumni.photoUrl} name={alumni.name} />
                </div>

                {/* Info area */}
                <div className="p-4 flex flex-col gap-1.5">
                  <h2
                    className="text-base font-bold truncate group-hover:opacity-80 transition-opacity"
                    style={{ color: PRIMARY }}
                  >
                    {alumni.name}
                  </h2>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {alumni.graduationYear && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${SECONDARY}33`, color: PRIMARY }}
                      >
                        {alumni.graduationYear}
                      </span>
                    )}
                    {alumni.department && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: `${PRIMARY}18`, color: PRIMARY }}
                      >
                        {alumni.department}
                      </span>
                    )}
                  </div>

                  {alumni.position && (
                    <p className="text-sm text-gray-500 truncate">{alumni.position}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
