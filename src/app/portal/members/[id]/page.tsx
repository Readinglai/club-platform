import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getMemberDetail, memberAccess } from "@/lib/membership/admin";

const PRIMARY = "#1a2744";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await memberAccess(user.id)).view) redirect("/portal");

  const [detail, t, locale] = await Promise.all([
    getMemberDetail((await params).id),
    getTranslations("portal.membersPage"),
    getLocale(),
  ]);
  if (!detail) notFound();
  const dateLocale = locale === "zh" ? "zh-TW" : "en-CA";
  const date = (d: Date | string) => new Date(d).toLocaleDateString(dateLocale, { timeZone: "America/Toronto", dateStyle: "medium" });

  const profileRows: Array<[string, string | null | undefined]> = detail.profile
    ? [
        [t("phone"), detail.profile.phone],
        [t("studentNumber"), detail.profile.studentNumber],
        [t("program"), detail.profile.program],
        [t("yearOfStudy"), detail.profile.yearOfStudy],
        [t("personalEmail"), detail.profile.personalEmail],
      ]
    : [];

  return (
    <main className="min-h-screen px-4 py-10 text-gray-900" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{detail.name || detail.email}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {detail.email}
            {detail.hasAccount && detail.accountSince ? ` · ${t("accountSince", { date: date(detail.accountSince) })}` : ` · ${t("noAccount")}`}
          </p>
        </div>

        <Section title={t("profileTitle")}>
          {profileRows.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noProfile")}</p>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {profileRows.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-gray-900">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section title={t("historyTitle")}>
          <ul className="flex flex-col gap-1.5 text-sm">
            {detail.memberships.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-1.5">
                <span>
                  <span className="font-mono">{m.memberCode}</span>
                  <span className="text-gray-500"> · {date(m.termStart)} – {date(m.termEnd)}</span>
                </span>
                <span className="text-gray-600">
                  {t(`status_${m.status}`)} · {t(`source_${m.source}`)}
                  {m.amountPaid != null && ` · $${m.amountPaid.toFixed(2)}`}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t("positionsTitle")}>
          {detail.positions.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noPositions")}</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {detail.positions.map((p) => (
                <li key={`${p.group}-${p.position}`}>{p.group} · <span className="text-gray-600">{t(`position_${p.position}`)}</span></li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("ticketsTitle")}>
          {detail.tickets.length === 0 ? (
            <p className="text-sm text-gray-500">{t("noTickets")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {detail.tickets.map((tk) => (
                <li key={tk.token} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-1.5">
                  <span>{tk.eventTitle} <span className="text-gray-500">· {date(tk.startAt)}</span></span>
                  <span className="text-gray-600">
                    {tk.status === "void" ? t("ticketVoid") : tk.checkedInAt ? t("checkedIn") : t("ticketValid")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  );
}
