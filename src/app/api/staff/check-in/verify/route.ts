import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hiloEventId } from "@/lib/hilo";

const COOKIE_NAME = "rocsaut_staff_checkin";
const COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

// The one event the door scanner admits (see /api/event/check-in).
async function scannerEvent() {
  const id = hiloEventId();
  if (!id) return null;
  const event = await db.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      startAt: true,
      location: true,
      settings: { select: { timezone: true } },
    },
  });
  if (!event) return null;
  return {
    id: event.id,
    title: event.title,
    startAt: event.startAt.toISOString(),
    location: event.location,
    timezone: event.settings?.timezone ?? "America/Toronto",
  };
}

function createAccessToken(code: string) {
  return crypto
    .createHash("sha256")
    .update(`rocsaut-staff-checkin:${code}`)
    .digest("hex");
}

export async function GET(req: NextRequest) {
  try {
    const staffCode = process.env.STAFF_CHECKIN_CODE;

    if (!staffCode) {
      return NextResponse.json(
        {
          success: false,
        },
        { status: 500 }
      );
    }

    const staffCookie = req.cookies.get(COOKIE_NAME)?.value;

    if (!staffCookie) {
      return NextResponse.json(
        {
          success: false,
        },
        { status: 401 }
      );
    }

    const expectedToken = createAccessToken(staffCode);

    if (staffCookie !== expectedToken) {
      return NextResponse.json(
        {
          success: false,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      event: await scannerEvent(),
    });
  } catch (error) {
    console.error("Staff verification check error:", error);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const staffCode = process.env.STAFF_CHECKIN_CODE;

    if (!staffCode) {
      console.error("STAFF_CHECKIN_CODE is not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "Staff check-in is not configured.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    const code = String(body.code ?? "").trim();

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter the staff access code.",
        },
        { status: 400 }
      );
    }

    if (code !== staffCode) {
      return NextResponse.json(
        {
          success: false,
          message: "Incorrect staff access code.",
        },
        { status: 401 }
      );
    }

    const token = createAccessToken(staffCode);

    const response = NextResponse.json({
      success: true,
      event: await scannerEvent(),
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error("Staff verification error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}