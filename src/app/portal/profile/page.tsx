import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access/current-user";
import { getProfileForForm } from "@/lib/membership/profile";
import { getCurrentMembership } from "@/lib/membership/purchase";

const PRIMARY = "#1a2744";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [t, profile, membership, positions] = await Promise.all([
    getTranslations("portal.profilePage"),
    getProfileForForm(user.id),
    getCurrentMembership(user.id),
    db.groupMember.findMany({
      where: { userId: user.id, group: { archived: false } },
      orderBy: { position: "asc" },
      select: { position: true, group: { select: { name: true } } },
    }),
  ]);
  if (!profile.completed) redirect("/portal/complete-profile");

  const rows: Array<[string, string]> = [
    [t("name"), profile.name],
    [t("email"), user.email],
    [t("phone"), profile.phone],
    [t("studentNumber"), profile.studentNumber],
    [t("program"), profile.program],
    [t("yearOfStudy"), profile.yearOfStudy],
    [t("personalEmail"), profile.personalEmail],
  ];

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("title")}</h1>
          <Link
            href="/portal/complete-profile"
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold"
            style={{ borderColor: PRIMARY, color: PRIMARY }}
          >
            {t("edit")}
          </Link>
        </div>

        <dl className="divide-y divide-gray-100 rounded-2xl bg-white px-5 shadow-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 py-3">
              <dt className="text-xs font-medium text-gray-500">{label}</dt>
              <dd className="text-sm" style={{ color: value ? PRIMARY : "#9ca3af" }}>{value || t("notFilled")}</dd>
            </div>
          ))}
        </dl>

        <dl className="divide-y divide-gray-100 rounded-2xl bg-white px-5 shadow-sm">
          <div className="flex flex-col gap-0.5 py-3">
            <dt className="text-xs font-medium text-gray-500">{t("membership")}</dt>
            <dd className="text-sm" style={{ color: PRIMARY }}>
              {membership ? t("member", { code: membership.memberCode }) : t("notMember")}
            </dd>
          </div>
          {positions.length > 0 && (
            <div className="flex flex-col gap-1 py-3">
              <dt className="text-xs font-medium text-gray-500">{t("positions")}</dt>
              {positions.map((p, i) => (
                <dd key={i} className="text-sm" style={{ color: PRIMARY }}>
                  {p.position === "PRESIDENT"
                    ? t("positionPRESIDENT")
                    : t(p.position === "VP" ? "positionVP" : "positionSTAFF", { group: p.group.name })}
                </dd>
              ))}
            </div>
          )}
        </dl>
      </div>
    </main>
  );
}
