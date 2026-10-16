import EventTickets from "./EventTickets";

/** Public ticket page for events after Halloween 2026 (readable /events/<slug> URLs come later). */
export default async function PublicEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-screen px-4 py-10" style={{ backgroundColor: "#f9f7f4" }}>
      <div className="mx-auto w-full max-w-xl">
        <EventTickets eventId={id} />
      </div>
    </main>
  );
}
