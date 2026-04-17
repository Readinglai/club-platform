import { Resend } from "resend";

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
  await sendEmail({
    to: opts.to,
    subject: `任務截止提醒：${opts.taskTitle}`,
    html: `
      <p>您好，</p>
      <p>您在任務小組「<strong>${opts.taskGroupName}</strong>」中有一個即將到期的任務：</p>
      <ul>
        <li><strong>任務：</strong>${opts.taskTitle}</li>
        <li><strong>截止日期：</strong>${due}</li>
      </ul>
      <p>請盡快完成，謝謝！</p>
      <p>ROCSAUT 團隊</p>
    `,
  });
}
