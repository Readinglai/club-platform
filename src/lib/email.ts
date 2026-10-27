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

export async function sendEventTicketEmail(opts: {
  to: string;
  name: string;
  tier: string;
  price: string;
  ticketUrl: string;
}) {
  const tierLabel =
  opts.tier === "LITE"
    ? "Lite Ticket"
    : opts.tier === "STANDARD"
      ? "Standard Ticket"
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
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Ticket confirmation for events using the Order/Ticket tables. */
export async function sendOrderTicketEmail(opts: {
  to: string;
  name: string;
  eventTitle: string;
  ticketType: string;
  /** Already formatted, e.g. "CA$25.00" or "Free". */
  price: string;
  /** Already formatted in the event's time zone. */
  when: string;
  location: string | null;
  ticketUrl: string;
}) {
  const e = escapeHtml;

  await sendEmail({
    to: opts.to,
    subject: `${opts.eventTitle} — Your Ticket`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>${e(opts.eventTitle)}</h2>
        <p>Hi ${e(opts.name)},</p>
        <p>Your ticket is confirmed.</p>
        <div style="margin: 20px 0; padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: #f8f8f8;">
          <p><strong>Ticket Type:</strong> ${e(opts.ticketType)}</p>
          <p><strong>Price:</strong> ${e(opts.price)}</p>
          <p><strong>When:</strong> ${e(opts.when)}</p>
          ${opts.location ? `<p><strong>Location:</strong> ${e(opts.location)}</p>` : ""}
        </div>
        <p>
          <a href="${e(opts.ticketUrl)}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">
            View My Ticket
          </a>
        </p>
        <p>Please have your ticket ready when you arrive.</p>
        <p>ROCSAUT Team</p>
      </div>
    `,
  });
}

/** Sent when an online membership payment is confirmed. */
export async function sendMembershipConfirmationEmail(opts: {
  to: string;
  name: string;
  memberCode: string;
  /** Already formatted, e.g. "Aug 31, 2027". */
  validUntil: string;
  portalUrl: string;
  /** Pass2U "add to wallet" page, when a pass was issued. */
  walletUrl?: string | null;
}) {
  const e = escapeHtml;

  await sendEmail({
    to: opts.to,
    subject: "Welcome to ROCSAUT — Your Membership",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>Welcome to ROCSAUT!</h2>
        <p>Hi ${e(opts.name)},</p>
        <p>Your membership is confirmed.</p>
        <div style="margin: 20px 0; padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: #f8f8f8;">
          <p><strong>Member code:</strong> ${e(opts.memberCode)}</p>
          <p><strong>Valid until:</strong> ${e(opts.validUntil)}</p>
        </div>
        ${opts.walletUrl ? `<p>
          <a href="${e(opts.walletUrl)}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">
            Add membership card to Wallet
          </a>
        </p>` : ""}
        <p>
          <a href="${e(opts.portalUrl)}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 6px;">
            View my membership
          </a>
        </p>
        <p>ROCSAUT Team</p>
      </div>
    `,
  });
}
