import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const memberCode = body.memberCode?.trim().toUpperCase();
    const personalEmail = body.personalEmail?.trim().toLowerCase();

    if (!memberCode || !personalEmail) {
      return NextResponse.json(
        { verified: false, error: "Member ID and personal email are required." },
        { status: 400 }
      );
    }

    const member = await db.rOCSAUT_Membership_Info.findFirst({
      where: {
        member_code: memberCode,
        personal_email: personalEmail,
      },
      select: {
        id: true,
        member_code: true,
        name: true,
        role: true,
      },
    });

    if (!member) {
      return NextResponse.json(
        { verified: false, error: "Membership information could not be verified." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      verified: true,
      member: {
        id: member.id,
        memberCode: member.member_code,
        name: member.name,
        role: member.role,
      },
    });
  } catch (error) {
    console.error("Member verification error:", error);

    return NextResponse.json(
      { verified: false, error: "Unable to verify membership." },
      { status: 500 }
    );
  }
}