import { Resend } from "resend";
import { db } from "@/lib/db";

// TODO: 待 rocsaut.ca domain 在 Resend 驗證後，改回 noreply@rocsaut.ca
const FROM = process.env.EMAIL_FROM ?? "ROCSAUT <onboarding@resend.dev>";

function getResend() {
  const key = process.env.EMAIL_API_KEY;
  if (!key) throw new Error("EMAIL_API_KEY is not set");
  return new Resend(key);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({ from: FROM, ...opts });
  if (error) {
    console.error("[email] Resend error:", error);
    throw new Error(error.message);
  }
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
