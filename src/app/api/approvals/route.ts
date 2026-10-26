/**
 * GET  /api/approvals — requests waiting for my decision, and requests I made.
 * POST /api/approvals — { action: "event.delete", targetId } asks for approval.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/access/current-user";
import { APPROVAL_RULES, canDecide, requestApproval, type ApprovalAction } from "@/lib/access/approvals";

const SELECT = {
  id: true,
  action: true,
  targetId: true,
  details: true,
  status: true,
  note: true,
  approverPosition: true,
  createdAt: true,
  decidedAt: true,
  requestedById: true,
  requestedBy: { select: { name: true, email: true } },
  decidedBy: { select: { name: true } },
} as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pending, mine] = await Promise.all([
    db.approvalRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, select: SELECT }),
    db.approvalRequest.findMany({
      where: { requestedById: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: SELECT,
    }),
  ]);

  const toDecide = [];
  for (const r of pending) if (await canDecide(user.id, r)) toDecide.push(r);

  return NextResponse.json({ toDecide, mine }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.action !== "string" || !(body.action in APPROVAL_RULES) || typeof body.targetId !== "string") {
    return NextResponse.json({ error: "action and targetId are required." }, { status: 400 });
  }

  const result = await requestApproval({
    userId: user.id,
    action: body.action as ApprovalAction,
    targetId: body.targetId,
  });
  return result.ok
    ? NextResponse.json({ ok: true, id: result.id }, { status: 201 })
    : NextResponse.json({ error: result.message }, { status: result.status });
}
