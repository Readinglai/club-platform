import { getTranslations } from "next-intl/server";

/** Same shape as the ticket, so nothing jumps when it arrives. */
export default async function Loading() {
  const t = await getTranslations("ticketPage");
  const bar = "rounded-md motion-safe:animate-pulse";
  return (
    <main className="px-3 pt-4 sm:px-6 lg:pt-10" aria-busy="true">
      <span className="sr-only" role="status">{t("loading")}</span>
      <div className="mx-auto grid max-w-md lg:max-w-5xl lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-t-2xl px-5 pb-8 pt-5 lg:rounded-l-2xl lg:rounded-tr-none lg:px-10 lg:pb-12" style={{ backgroundColor: "var(--ink)" }}>
          <div className={`h-7 w-28 ${bar}`} style={{ backgroundColor: "var(--ink-line)" }} />
          <div className={`mt-8 h-20 w-40 lg:mt-14 ${bar}`} style={{ backgroundColor: "var(--ink-line)" }} />
          <div className={`mt-6 h-8 w-3/4 ${bar}`} style={{ backgroundColor: "var(--ink-line)" }} />
          <div className={`mt-5 h-4 w-1/2 ${bar}`} style={{ backgroundColor: "var(--ink-line)" }} />
        </div>
        <div className="ticket-stub flex flex-col gap-3 rounded-b-2xl px-5 pb-6 pt-7 lg:rounded-r-2xl lg:rounded-bl-none lg:px-8">
          <div className={`h-5 w-36 ${bar}`} style={{ backgroundColor: "var(--line)" }} />
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-16 ${bar}`} style={{ backgroundColor: "var(--ground)" }} />
          ))}
        </div>
      </div>
    </main>
  );
}
