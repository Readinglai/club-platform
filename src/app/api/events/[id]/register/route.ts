/**
 * route.ts — 活動報名 API
 *
 * POST   — 報名活動（已滿直接回傳 409）
 * DELETE — 取消報名
 *
 * 並發安全：capacity check 使用 pg_advisory_xact_lock 確保同一活動
 * 的報名請求序列化執行，防止超額。
 */

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getConfig } from "@/lib/config";
import { RegistrationStatus } from "@/generated/prisma/client";

/** POST /api/events/[id]/register — 報名活動 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, startAt: true, endAt: true, location: true, capacity: true, published: true },
  });

  if (!event || !event.published) {
    return NextResponse.json({ error: "活動不存在或尚未發布" }, { status: 404 });
  }

  // 檢查是否已有非取消的報名記錄
  const existing = await db.registration.findUnique({
    where: { userId_eventId: { userId: session.user.id, eventId } },
  });

  if (existing && existing.status !== RegistrationStatus.CANCELLED) {
    return NextResponse.json({ error: "已報名此活動" }, { status: 409 });
  }

  // capacity check + create inside a serialized transaction
  // pg_advisory_xact_lock ensures only one concurrent request per eventId
  let registration;
  try {
    registration = await db.$transaction(async (tx) => {
      if (event.capacity !== null) {
        // Advisory lock scoped to this transaction; released automatically on commit/rollback
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId})::bigint)`;

        const registeredCount = await tx.registration.count({
          where: { eventId, status: RegistrationStatus.REGISTERED },
        });

        if (registeredCount >= event.capacity) {
          throw Object.assign(new Error("CAPACITY_EXCEEDED"), { code: "CAPACITY_EXCEEDED" });
        }
      }

      if (existing) {
        return tx.registration.update({
          where: { id: existing.id },
          data: { status: RegistrationStatus.REGISTERED },
        });
      }
      return tx.registration.create({
        data: { userId: session.user.id, eventId, status: RegistrationStatus.REGISTERED },
      });
    });
  } catch (err) {
    if (err instanceof Error && (err as NodeJS.ErrnoException & { code?: string }).code === "CAPACITY_EXCEEDED") {
      return NextResponse.json({ error: "活動名額已滿" }, { status: 409 });
    }
    console.error("[register] 報名失敗：", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }

  // 成功報名後寄確認 Email（失敗不影響報名結果）
  try {
    const config = getConfig();
    const resend = new Resend(config.infrastructure.email.api_key);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, name: true },
    });

    if (user) {
      const startStr = event.startAt.toLocaleString("zh-TW", {
        timeZone: "America/Toronto",
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
      const endStr = event.endAt
        ? event.endAt.toLocaleString("zh-TW", { timeZone: "America/Toronto", hour: "2-digit", minute: "2-digit" })
        : null;

      // TODO: 待 rocsaut.ca domain 在 Resend 驗證後，改回 config.infrastructure.email.from (noreply@rocsaut.ca)
      await resend.emails.send({
        from: "ROCSAUT <onboarding@resend.dev>",
        to: user.email,
        subject: `活動報名確認：${event.title}`,
        html: `
          <h2 style="color:#1a2744">報名確認</h2>
          <p>親愛的 ${user.name}，您已成功報名以下活動：</p>
          <table style="border-collapse:collapse;margin-top:12px">
            <tr><td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">活動名稱</td>
                <td style="padding:6px 0;font-weight:600">${event.title}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">活動時間</td>
                <td style="padding:6px 0">${startStr}${endStr ? ` – ${endStr}` : ""}</td></tr>
            ${event.location ? `<tr><td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">活動地點</td>
                <td style="padding:6px 0">${event.location}</td></tr>` : ""}
          </table>
          <p style="margin-top:16px;color:#666;font-size:14px">如需取消報名，請至活動頁面點擊「取消報名」。</p>
        `,
      });
    }
  } catch (err) {
    console.error("[register] Email 寄送失敗：", err);
  }

  return NextResponse.json(registration, { status: 201 });
  } catch (err) {
    console.error("[register] 未預期錯誤：", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}

/** DELETE /api/events/[id]/register — 取消報名 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }

    const { id: eventId } = await params;

    const registration = await db.registration.findUnique({
      where: { userId_eventId: { userId: session.user.id, eventId } },
    });

    if (!registration || registration.status === RegistrationStatus.CANCELLED) {
      return NextResponse.json({ error: "找不到有效的報名記錄" }, { status: 404 });
    }

    await db.registration.update({
      where: { id: registration.id },
      data: { status: RegistrationStatus.CANCELLED },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[register] 取消報名失敗：", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
