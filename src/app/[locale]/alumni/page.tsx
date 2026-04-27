/**
 * /[locale]/alumni — 公開校友目錄頁面
 *
 * 展示所有 isPublic=true 的校友資料。
 * 任何訪客皆可瀏覽，不需登入。
 * 顯示：大頭貼、姓名、離開年份、擔任職位、部門、LinkedIn / Instagram 連結。
 */

import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import AlumniPhotoCard from "./AlumniPhotoCard";

export const dynamic = "force-dynamic";

const PRIMARY   = "#1a2744";
const SECONDARY = "#c9b99a";

interface AlumniPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AlumniPage({ params }: AlumniPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("alumni");

  // 從資料庫讀取公開校友，依離開年份降冪排列
  let alumniList: {
    id: string;
    name: string;
    graduationYear: number | null;
    position: string | null;
    department: string | null;
    bio: string | null;
    linkedinUrl: string | null;
    instagramUrl: string | null;
    photoUrl: string | null;
  }[] = [];

  try {
    alumniList = await db.alumni.findMany({
      where: { isPublic: true },
      orderBy: [{ graduationYear: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        graduationYear: true,
        position: true,
        department: true,
        bio: true,
        linkedinUrl: true,
        instagramUrl: true,
        photoUrl: true,
      },
    });
  } catch {
    // DB 錯誤時顯示空清單，不中斷頁面
    alumniList = [];
  }

  // 整理可用的年份列表（用於分組顯示）
  const years = [...new Set(
    alumniList
      .map((a) => a.graduationYear)
      .filter((y): y is number => y !== null)
  )].sort((a, b) => b - a);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Hero 區塊 */}
      <section className="px-4 py-16 sm:py-20 text-center" style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-wide" style={{ color: SECONDARY }}>
            {t("title")}
          </h1>
          <div className="w-12 h-0.5 rounded-full" style={{ backgroundColor: `${SECONDARY}88` }} />
          <p className="text-base" style={{ color: `${SECONDARY}99` }}>
            {t("subtitle")}
          </p>
          {/* 統計數字 */}
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

      {/* 校友卡片區域 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        {alumniList.length === 0 ? (
          <p className="text-center text-gray-400 py-20">{t("noAlumni")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {alumniList.map((alumni) => (
              <div
                key={alumni.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                {/* 大頭貼（Client Component，因 onError 為 client-side 事件） */}
                <AlumniPhotoCard photoUrl={alumni.photoUrl} name={alumni.name} />

                {/* 卡片內容 */}
                <div className="p-5">
                  <h2 className="text-lg font-bold truncate" style={{ color: PRIMARY }}>
                    {alumni.name}
                  </h2>

                  {/* 年份 + 職位 */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
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
                    <p className="text-sm text-gray-500 mt-1.5 truncate">{alumni.position}</p>
                  )}

                  {alumni.bio && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{alumni.bio}</p>
                  )}

                  {/* 社群連結 */}
                  {(alumni.linkedinUrl || alumni.instagramUrl) && (
                    <div className="flex gap-3 mt-3 pt-3 border-t border-gray-100">
                      {alumni.linkedinUrl && (
                        <a
                          href={alumni.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium transition-opacity hover:opacity-70 flex items-center gap-1"
                          style={{ color: "#0A66C2" }}
                          aria-label={`${alumni.name} LinkedIn`}
                        >
                          {/* LinkedIn icon */}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                          LinkedIn
                        </a>
                      )}
                      {alumni.instagramUrl && (
                        <a
                          href={alumni.instagramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium transition-opacity hover:opacity-70 flex items-center gap-1"
                          style={{ color: "#E1306C" }}
                          aria-label={`${alumni.name} Instagram`}
                        >
                          {/* Instagram icon */}
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                          </svg>
                          Instagram
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
