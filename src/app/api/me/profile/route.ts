/**
 * GET  /api/me/profile — the signed-in person's profile (pre-filled if new)
 * PUT  /api/me/profile — save it; body: { name, phone, studentNumber, program, yearOfStudy, personalEmail? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access/current-user";
import { getProfileForForm, saveProfile } from "@/lib/membership/profile";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(
    { email: user.email, ...(await getProfileForForm(user.id)) },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = await saveProfile(user.id, body);
  if (!result.ok) {
    return NextResponse.json({ error: "Please complete the required fields.", missing: result.missing }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
