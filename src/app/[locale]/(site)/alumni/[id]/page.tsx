import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import AlumniPhotoCard from "../AlumniPhotoCard";

export const dynamic = "force-dynamic";

const PRIMARY   = "#1a2744";
const SECONDARY = "#c9b99a";

interface AlumniDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AlumniDetailPage({ params }: AlumniDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("alumni");

  const alumni = await db.alumni.findFirst({
    where: { id, isPublic: true },
  });

  if (!alumni) notFound();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Hero banner */}
      <section className="px-4 py-14 sm:py-20" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-8" aria-label="breadcrumb">
            <Link
              href={`/${locale}/alumni`}
              className="transition-opacity hover:opacity-70"
              style={{ color: `${SECONDARY}99` }}
            >
              {t("title")}
            </Link>
            <span style={{ color: `${SECONDARY}44` }}>/</span>
            <span style={{ color: `${SECONDARY}77` }} className="truncate max-w-xs">
              {alumni.name}
            </span>
          </nav>

          {/* Profile header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar circle */}
            <div
              className="w-28 h-28 rounded-full overflow-hidden flex-shrink-0 border-4 shadow-lg"
              style={{ borderColor: `${SECONDARY}44` }}
            >
              <AlumniPhotoCard photoUrl={alumni.photoUrl} name={alumni.name} />
            </div>

            <div className="flex flex-col items-center sm:items-start gap-2 pb-1">
              <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: SECONDARY }}>
                {alumni.name}
              </h1>
              <div className="flex flex-wrap gap-2">
                {alumni.graduationYear && (
                  <span
                    className="text-sm px-3 py-1 rounded-full font-medium"
                    style={{ backgroundColor: `${SECONDARY}33`, color: SECONDARY }}
                  >
                    {alumni.graduationYear}
                  </span>
                )}
                {alumni.department && (
                  <span
                    className="text-sm px-3 py-1 rounded-full font-medium"
                    style={{ backgroundColor: `${SECONDARY}1a`, color: `${SECONDARY}cc` }}
                  >
                    {alumni.department}
                  </span>
                )}
              </div>
              {alumni.position && (
                <p className="text-base" style={{ color: `${SECONDARY}99` }}>
                  {alumni.position}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex flex-col gap-6">
          {/* Bio */}
          {alumni.bio && (
            <div
              className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm"
              style={{ border: "1px solid #e5e7eb" }}
            >
              <h2 className="text-base font-semibold mb-3" style={{ color: PRIMARY }}>
                {t("bio")}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {alumni.bio}
              </p>
            </div>
          )}

          {/* Social links */}
          {(alumni.linkedinUrl || alumni.instagramUrl) && (
            <div
              className="rounded-2xl bg-white p-6 shadow-sm flex flex-wrap gap-4"
              style={{ border: "1px solid #e5e7eb" }}
            >
              {alumni.linkedinUrl && (
                <a
                  href={alumni.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#0A66C2", color: "#fff" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  {t("linkedinProfile")}
                </a>
              )}
              {alumni.instagramUrl && (
                <a
                  href={alumni.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: "#E1306C", color: "#fff" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                  {t("instagramProfile")}
                </a>
              )}
            </div>
          )}

          {/* Back button */}
          <div>
            <Link
              href={`/${locale}/alumni`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80"
              style={{ borderColor: PRIMARY, color: PRIMARY }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
