/**
 * GET /api/events — public listing of published events
 *
 * Query params:
 *   upcoming=true  — only events starting within the last 24h or later
 *   limit=N        — max number of events to return
 *
 * Output: Event[] ordered by startAt asc
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get("upcoming") === "true";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const events = await db.event.findMany({
      where: {
        published: true,
        ...(upcoming
          ? {
              OR: [
                { startAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
                { endAt: { gte: new Date() } },
              ],
            }
          : {}),
      },
      orderBy: { startAt: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        location: true,
        capacity: true,
      },
    });

    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
