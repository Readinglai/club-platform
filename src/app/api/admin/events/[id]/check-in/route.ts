import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/get-session-user";
import { db } from "@/lib/db";
import { RegistrationStatus } from "@/generated/prisma/client";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const sessionUser = await getSessionUser(request);

    if (!sessionUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (sessionUser.roleLevel < 3) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: eventId } = await params;
    const body = await request.json();

    if (
      typeof body.memberCode !== "string" ||
      body.memberCode.trim() === ""
    ) {
      return NextResponse.json(
        { error: "memberCode is required" },
        { status: 400 }
      );
    }

    const memberCode = body.memberCode.trim();

    const member = await db.rOCSAUT_Membership_Info.findFirst({
      where: {
        member_code: memberCode,
      },
      select: {
        member_code: true,
        name: true,
        email: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        {
          result: "denied",
          reason: "Member not found",
        },
        { status: 404 }
      );
    }

    if (!member.email) {
      return NextResponse.json(
        {
          result: "denied",
          reason: "Member has no email",
        },
        { status: 404 }
      );
    }

    const user = await db.user.findUnique({
      where: {
        email: member.email,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          result: "denied",
          reason: "User account not found",
        },
        { status: 404 }
      );
    }

    const registration = await db.registration.findUnique({
      where: {
        userId_eventId: {
          userId: user.id,
          eventId,
        },
      },
      select: {
        id: true,
        status: true,
        attendedAt: true,
      },
    });

    if (
      !registration ||
      registration.status !== RegistrationStatus.REGISTERED
    ) {
      return NextResponse.json(
        {
          result: "denied",
          reason: "Not registered for this event",
          member: {
            name: user.name,
            email: user.email,
          },
        },
        { status: 403 }
      );
    }

    if (registration.attendedAt) {
      return NextResponse.json({
        result: "already_checked_in",
        member: {
          name: user.name,
          email: user.email,
        },
        attendedAt: registration.attendedAt,
      });
    }

    const updated = await db.registration.update({
      where: {
        id: registration.id,
      },
      data: {
        attendedAt: new Date(),
      },
      select: {
        id: true,
        attendedAt: true,
      },
    });

    return NextResponse.json({
      result: "checked_in",
      member: {
        name: user.name,
        email: user.email,
      },
      attendedAt: updated.attendedAt,
    });
  } catch (error) {
    console.error("[check-in] Error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}