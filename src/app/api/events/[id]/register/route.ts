/**
 * route.ts — 活動報名 API
 *
 * 功能：報名或取消報名指定活動
 * 輸入：
 *   POST   — 無 body（從 URL [id] 和 session 識別）
 *   DELETE — 無 body（從 URL [id] 和 session 識別）
 * 輸出：
 *   POST   — 建立的 Registration 物件（含 status）
 *   DELETE — { success: true }
 * 驗證：未登入回傳 401；活動不存在或未發布回傳 404；重複報名回傳 409
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
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: eventId } = await params;

  // 查找活動，同時取得目前 REGISTERED 人數
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: { status: RegistrationStatus.REGISTERED },
        select: { id: true },
      },
    },
  });

  if (!event || !event.published) {
    return NextResponse.json({ error: "活動不存在或尚未發布" }, { status: 404 });
  }

  // 檢查是否已有非取消的報名記錄
  const existing = await db.registration.findUnique({
    where: {
      userId_eventId: { userId: session.user.id, eventId },
    },
  });

  if (existing && existing.status !== RegistrationStatus.CANCELLED) {
    return NextResponse.json({ error: "已報名此活動" }, { status: 409 });
  }

  // 計算剩餘名額，決定狀態
  const registeredCount = event.registrations.length;
  const isFull =
    event.capacity !== null && registeredCount >= event.capacity;
  const status = isFull
    ? RegistrationStatus.WAITLISTED
    : RegistrationStatus.REGISTERED;

  // 若有取消記錄則更新；否則建立新記錄
  let registration;
  if (existing) {
    registration = await db.registration.update({
      where: { id: existing.id },
      data: { status },
    });
  } else {
    registration = await db.registration.create({
      data: { userId: session.user.id, eventId, status },
    });
  }

  // 成功報名（非候補）才寄確認 Email
  if (status === RegistrationStatus.REGISTERED) {
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
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const endStr = event.endAt
          ? event.endAt.toLocaleString("zh-TW", {
              timeZone: "America/Toronto",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;

        await resend.emails.send({
          from: config.infrastructure.email.from,
          to: user.email,
          subject: `活動報名確認：${event.title}`,
          html: `
            <h2 style="color:#1a2744">報名確認</h2>
            <p>親愛的 ${user.name}，您已成功報名以下活動：</p>
            <table style="border-collapse:collapse;margin-top:12px">
              <tr>
                <td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">活動名稱</td>
                <td style="padding:6px 0;font-weight:600">${event.title}</td>
              </tr>
              <tr>
                <td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">活動時間</td>
                <td style="padding:6px 0">${startStr}${endStr ? ` – ${endStr}` : ""}</td>
              </tr>
              ${
                event.location
                  ? `<tr>
                <td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">活動地點</td>
                <td style="padding:6px 0">${event.location}</td>
              </tr>`
                  : ""
              }
            </table>
            <p style="margin-top:16px;color:#666;font-size:14px">
              如需取消報名，請至活動頁面點擊「取消報名」。
            </p>
          `,
        });
      }
    } catch (err) {
      // Email 寄送失敗不影響報名結果，僅記錄錯誤
      console.error("[register] Email 寄送失敗：", err);
    }
  }

  return NextResponse.json(registration, { status: 201 });
}

/** DELETE /api/events/[id]/register — 取消報名 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const registration = await db.registration.findUnique({
    where: {
      userId_eventId: { userId: session.user.id, eventId },
    },
  });

  if (!registration || registration.status === RegistrationStatus.CANCELLED) {
    return NextResponse.json(
      { error: "找不到有效的報名記錄" },
      { status: 404 }
    );
  }

  await db.registration.update({
    where: { id: registration.id },
    data: { status: RegistrationStatus.CANCELLED },
  });

  return NextResponse.json({ success: true });
}
