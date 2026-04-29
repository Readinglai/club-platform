import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  bio: true,
  major: true,
  rocsautYear: true,
  instagram: true,
  linkedin: true,
  createdAt: true,
  department: {
    select: { id: true, slug: true, name: true },
  },
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: USER_SELECT,
  });

  if (!user) {
    return NextResponse.json({ error: "使用者不存在" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { name, image, bio, major, rocsautYear, instagram, linkedin } =
    body as Record<string, unknown>;

  const updateData: {
    name?: string;
    image?: string | null;
    bio?: string | null;
    major?: string | null;
    rocsautYear?: number | null;
    instagram?: string | null;
    linkedin?: string | null;
  } = {};

  if (typeof name === "string" && name.trim().length > 0) {
    updateData.name = name.trim();
  }
  if (typeof image === "string") {
    updateData.image = image || null;
  }
  if (typeof bio === "string") {
    updateData.bio = bio.trim() || null;
  }
  if (typeof major === "string") {
    updateData.major = major.trim() || null;
  }
  if (rocsautYear === null || rocsautYear === undefined) {
    // omit — don't wipe unless explicitly sent
  } else if (typeof rocsautYear === "number" && rocsautYear >= 1 && rocsautYear <= 10) {
    updateData.rocsautYear = rocsautYear;
  } else if (rocsautYear === 0) {
    updateData.rocsautYear = null;
  }
  if (typeof instagram === "string") {
    updateData.instagram = instagram.trim() || null;
  }
  if (typeof linkedin === "string") {
    updateData.linkedin = linkedin.trim() || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "無有效更新欄位" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: USER_SELECT,
  });

  return NextResponse.json(user);
}
