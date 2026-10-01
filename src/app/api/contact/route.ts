import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

interface ContactRequestBody {
  name: string;
  email: string;
  message: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

export async function POST(request: NextRequest) {
  let body: ContactRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "無效的 JSON 格式" },
      { status: 400 }
    );
  }

  const { name, email, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "請填寫所有必填欄位（姓名、Email、訊息）" },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Email 格式不正確" },
      { status: 400 }
    );
  }

  const toEmail =
    process.env.CONTACT_TO_EMAIL ?? process.env.EMAIL_USER;

  if (!toEmail) {
    console.error("[contact API] CONTACT_TO_EMAIL or EMAIL_USER is not set");
    return NextResponse.json(
      { error: "Email 服務尚未設定，請聯絡系統管理員" },
      { status: 500 }
    );
  }

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      replyTo: `${name} <${email}>`,
      subject: `[ROCSAUT] 聯絡表單訊息 — 來自 ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a2744; margin-bottom: 16px;">📬 聯絡表單新訊息</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555; width: 80px;">姓名</td>
              <td style="padding: 8px 0; color: #333;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Email</td>
              <td style="padding: 8px 0; color: #333;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555; vertical-align: top;">訊息</td>
              <td style="padding: 8px 0; color: #333; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #c9b99a; margin: 24px 0;" />
          <p style="font-size: 12px; color: #999;">
            此信件由 ROCSAUT 官網聯絡表單自動發送。
            <br />
            回覆此信件將直接傳送給表單提交者。
          </p>
        </div>
      `,
      text: `聯絡表單新訊息\n\n姓名：${name}\nEmail：${email}\n\n訊息：\n${message}`,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("[contact API] 發信錯誤：", err);

    return NextResponse.json(
      { error: "發信失敗，請稍後再試" },
      { status: 500 }
    );
  }
}