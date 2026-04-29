import { NextRequest, NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/guard";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const guard = await requireAuthJson(4, request);
  if (guard.error) return guard.error;

  const { id } = await params;
  const body = (await request.json()) as { image?: unknown };
  const image = typeof body.image === "string" ? body.image : null;

  try {
    const user = await db.user.update({
      where: { id },
      data: { image },
      select: { id: true, image: true },
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
