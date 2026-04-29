import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const members = await db.user.findMany({
    where: { role: { notIn: ["SUPER_ADMIN", "ADMIN"] } },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      department: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(members);
}
