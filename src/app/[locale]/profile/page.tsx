import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login`);
  }

  if (ROLE_LEVEL[session.user.role] < 4) {
    redirect(`/${locale}`);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      major: true,
      rocsautYear: true,
      instagram: true,
      linkedin: true,
    },
  });

  if (!user) redirect(`/${locale}/login`);

  const t = await getTranslations("profile");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f9f7f4" }}>
      {/* Hero */}
      <section className="px-4 py-14 sm:py-20 text-center" style={{ backgroundColor: "#1a2744" }}>
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <Link
            href={`/${locale}/admin`}
            className="self-start inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#c9b99a22", color: "#c9b99a" }}
          >
            ← 返回後台
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wide" style={{ color: "#c9b99a" }}>
            {t("title")}
          </h1>
          <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: "#c9b99a88" }} />
          <p className="text-sm" style={{ color: "#c9b99a99" }}>
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ProfileForm user={user} locale={locale} />
      </div>
    </div>
  );
}
