import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LEVEL } from "@/lib/rbac";
import { decode } from "@auth/core/jwt";
import type { Role } from "@/generated/prisma/client";

const PROTECTED_EMAIL = "flyincloud2001@gmail.com";

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

async function tryGetUserId(request: NextRequest): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const decoded = await decode({
        token,
        secret: (process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)!,
        salt: "authjs.session-token",
      });
      if (decoded?.sub) return decoded.sub;
    } catch {
      // invalid token
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const userId = await tryGetUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "æœªç™»å…¥" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });

  if (!user) {
    return NextResponse.json({ error: "ä½¿ç”¨è€…ä¸å­˜åœ¨" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const userId = await tryGetUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "æœªç™»å…¥" }, { status: 401 });
  }

  const selfUser = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true },
  });
  if (!selfUser) {
    return NextResponse.json({ error: "ä½¿ç”¨è€…ä¸å­˜åœ¨" }, { status: 404 });
  }

  const currentRole = (selfUser.role as Role | undefined) ?? "MEMBER";
  if (ROLE_LEVEL[currentRole] < 4) {
    return NextResponse.json({ error: "æ¬Šé™ä¸è¶³" }, { status: 403 });
  }

  const portalSession = await auth();
  const callerEmail = portalSession?.user?.email ?? selfUser.email;
  if (selfUser.email === PROTECTED_EMAIL && callerEmail !== PROTECTED_EMAIL) {
    return NextResponse.json({ error: "æ­¤å¸³è™Ÿå—ç³»çµ±ä¿è­·ï¼Œç„¡æ³•ä¿®æ”¹" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "è«‹æ±‚æ ¼å¼éŒ¯èª¤" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "è«‹æ±‚æ ¼å¼éŒ¯èª¤" }, { status: 400 });
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
    // omit
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
    return NextResponse.json({ error: "ç„¡æœ‰æ•ˆæ›´æ–°æ¬„ä½" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: userId },
    data: updateData,
    select: USER_SELECT,
  });

  return NextResponse.json(user);
}

