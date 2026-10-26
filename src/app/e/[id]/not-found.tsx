import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Unknown or unpublished event: say so, and offer the buyer's own tickets. */
export default async function EventNotFound() {
  const t = await getTranslations("ticketPage");
  return (
    <main className="px-3 pt-4 sm:px-6 lg:pt-10">
      <div className="mx-auto max-w-md rounded-2xl px-6 py-10" style={{ backgroundColor: "var(--paper)", border: "1px solid var(--line)" }}>
        <h1 className="text-xl font-semibold">{t("unavailableTitle")}</h1>
        <p className="mt-2 text-[0.9375rem]" style={{ color: "var(--muted)" }}>{t("unavailableText")}</p>
        <Link
          href="/portal/tickets"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: "var(--ink)", outlineColor: "var(--ink)" }}
        >
          {t("myTickets")}
        </Link>
      </div>
    </main>
  );
}
