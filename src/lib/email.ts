import nodemailer from "nodemailer";
import { db } from "@/lib/db";

const FROM = process.env.EMAIL_USER ?? "rocsaut.email@gmail.com";

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    throw new Error("EMAIL_USER or EMAIL_PASSWORD is not set");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

/** Fetch DB template; fall back to provided defaults if not found */
async function getTemplate(
  key: string,
  defaults: { subject: string; body: string }
): Promise<{ subject: string; body: string }> {
  try {
    const tpl = await db.emailTemplate.findUnique({ where: { key } });
    if (tpl) return { subject: tpl.subject, body: tpl.body };
  } catch {
    // DB unreachable — use defaults
  }
  return defaults;
}

/** Replace {variable} placeholders in a template string */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export async function sendWelcomeEmail(opts: { to: string; name: string }) {
  const tpl = await getTemplate("welcome", {
    subject: "歡迎加入 ROCSAUT!",
    body: "親愛的 {name}，\n\n歡迎加入 ROCSAUT！期待與您一起成長。\n\nROCSAUT 團隊",
  });

  const vars = { name: opts.name };

  await sendEmail({
    to: opts.to,
    subject: interpolate(tpl.subject, vars),
    html: interpolate(tpl.body, vars).replace(/\n/g, "<br>"),
  });
}

export async function sendTaskStatusEmail(opts: {
  to: string;
  taskTitle: string;
  newStatus: string;
  taskGroupName: string;
}) {
  const statusLabel: Record<string, string> = {
    TODO: "待辦",
    IN_PROGRESS: "進行中",
    DONE: "已完成",
  };

  await sendEmail({
    to: opts.to,
    subject: `任務狀態更新：${opts.taskTitle}`,
    html: `
      <p>您好，</p>
      <p>您在任務小組「<strong>${opts.taskGroupName}</strong>」中負責的任務狀態已更新：</p>
      <ul>
        <li><strong>任務：</strong>${opts.taskTitle}</li>
        <li><strong>新狀態：</strong>${statusLabel[opts.newStatus] ?? opts.newStatus}</li>
      </ul>
      <p>ROCSAUT 團隊</p>
    `,
  });
}

export async function sendTaskReminderEmail(opts: {
  to: string;
  taskTitle: string;
  dueAt: Date;
  taskGroupName: string;
}) {
  const due = opts.dueAt.toLocaleDateString("zh-TW");

  const tpl = await getTemplate("event_reminder", {
    subject: "任務截止提醒：{event_title}",
    body: "您好，\n\n您在任務小組「{task_group}」中有一個即將到期的任務：\n- 任務：{event_title}\n- 截止日期：{event_date}\n\n請盡快完成，謝謝！\n\nROCSAUT 團隊",
  });

  const vars = {
    event_title: opts.taskTitle,
    event_date: due,
    task_group: opts.taskGroupName,
    name: "",
  };

  await sendEmail({
    to: opts.to,
    subject: interpolate(tpl.subject, vars),
    html: interpolate(tpl.body, vars).replace(/\n/g, "<br>"),
  });
}

export async function sendEventTicketEmail(opts: {
  to: string;
  name: string;
  tier: string;
  price: string;
  ticketUrl: string;
}) {
  const tierLabel =
    opts.tier === "REGULAR"
      ? "Regular Ticket"
      : "Unlimited Ticket";

  await sendEmail({
    to: opts.to,
    subject: "ROCSAUT 2026 Halloween Party — Your Ticket",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>ROCSAUT 2026 Halloween Party</h2>

        <p>Hi ${opts.name},</p>

        <p>
          Your ticket purchase has been confirmed.
        </p>

        <div style="
          margin: 20px 0;
          padding: 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: #f8f8f8;
        ">
          <p><strong>Ticket Type:</strong> ${tierLabel}</p>
          <p><strong>Price:</strong> CA$${opts.price}</p>
          <p><strong>Date:</strong> October 23, 2026</p>
          <p><strong>Time:</strong> 7:30 PM – 11:30 PM</p>
          <p><strong>Location:</strong> 38 Grenville St. 2F, Toronto</p>
        </div>

        <p>
          Your ticket is available here:
        </p>

        <p>
          <a
            href="${opts.ticketUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #111;
              color: #fff;
              text-decoration: none;
              border-radius: 6px;
            "
          >
            View My Ticket
          </a>
        </p>

        <p>
          Please keep this email and have your ticket ready when you arrive.
        </p>

        <p>
          ROCSAUT Team
        </p>
      </div>
    `,
  });
}