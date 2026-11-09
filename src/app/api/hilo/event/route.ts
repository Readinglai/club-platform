/** GET /api/hilo/event — the Hilo page's data again (after a sold-out or a "check again"). */

import { NextResponse } from "next/server";
import { getPublicEvent } from "@/lib/events/public";
import { hiloEventId, hiloShowsDrafts } from "@/lib/hilo";

export async function GET() {
  const eventId = hiloEventId();
  const data = eventId ? await getPublicEvent(eventId, null, { allowUnpublished: hiloShowsDrafts() }) : null;
  return data
    ? NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "Event not found" }, { status: 404 });
}
