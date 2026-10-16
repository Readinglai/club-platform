import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getMyTickets, splitByTime } from "@/lib/tickets/mine";
import TicketCard from "./TicketCard";

const PRIMARY = "#1a2744";

export default async function MyTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [t, tickets] = await Promise.all([getTranslations("portal.ticketsPage"), getMyTickets(user.id, user.email)]);
  const { upcoming, past } = splitByTime(tickets);

  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: PRIMARY }}>{t("title")}</h1>

        {tickets.length === 0 && <p className="rounded-2xl bg-white p-5 text-sm text-gray-600 shadow-sm">{t("none")}</p>}

        {upcoming.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{t("upcoming")}</h2>
            {upcoming.map((ticket) => <TicketCard key={ticket.token} ticket={ticket} />)}
          </section>
        )}

        {past.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{t("past")}</h2>
            {past.map((ticket) => <TicketCard key={ticket.token} ticket={ticket} past />)}
          </section>
        )}
      </div>
    </main>
  );
}
