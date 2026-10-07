import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EVENT_ID = "00b84455-309c-4dba-9722-b031f9042081";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const memberId = String(body.memberId ?? "").trim();
    const cardName = String(body.cardName ?? "").trim();

    if (!memberId || !cardName) {
      return NextResponse.json(
        {
          verified: false,
          message:
            "Member verification failed. Please check your Member ID and the name on your member card.",
        },
        { status: 400 }
      );
    }

    // Find member by Member ID
    const member = await db.rOCSAUT_Membership_Info.findFirst({
      where: {
        member_code: memberId,
      },
    });

    // Member ID doesn't exist
    if (!member || !member.name) {
      return NextResponse.json(
        {
          verified: false,
          message:
            "Member verification failed. Please check your Member ID and the name on your member card.",
        },
        { status: 400 }
      );
    }

    // Compare names ignoring capitalization and extra spaces
    const normalizeName = (name: string) =>
      name.trim().replace(/\s+/g, " ").toLowerCase();

    if (normalizeName(member.name) !== normalizeName(cardName)) {
      return NextResponse.json(
        {
          verified: false,
          message:
            "Member verification failed. Please check your Member ID and the name on your member card.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      verified: true,
      memberId: member.id,
      name: member.name,
    });
  } catch (error) {
    console.error("Member verification error:", error);

    return NextResponse.json(
      {
        verified: false,
        message: "Something went wrong. Please try again later.",
      },
      { status: 500 }
    );
  }
}