/**
 * app/api/contact/route.ts — 聯絡表單 API（Route Handler）
 *
 * 接受 POST 請求，讀取 name、email、message 欄位，
 * 透過 Resend 發送 Email 到社團信箱（環境變數 CONTACT_TO_EMAIL）。
 *
 * 不存資料庫，僅做即時發信。
 *
 * 環境變數（需設定在 .env.local）：
 * - EMAIL_API_KEY：Resend API key（config.yaml: infrastructure.email.api_key）
 * - CONTACT_TO_EMAIL：收件信箱（社團 Email），預設 noreply@rocsaut.ca
 * - CONTACT_FROM_EMAIL：寄件地址，預設 noreply@rocsaut.ca
 *
 * 回傳：
 * - 200 { success: true }
 * - 400 { error: "缺少必要欄位" }
 * - 500 { error: "發信失敗，請稍後再試" }
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// ─── 請求 body 型別 ───────────────────────────────────────────────────────────

interface ContactRequestBody {
  name: string;
  email: string;
  message: string;
}

// ─── 簡單的 Email 格式驗證（RFC 5322 基本版）────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. 解析 request body
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

  // 2. 驗證必填欄位
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "請填寫所有必填欄位（姓名、Email、訊息）" },
      { status: 400 }
    );
  }

  // 3. 驗證 Email 格式
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Email 格式不正確" },
      { status: 400 }
    );
  }

  // 4. 初始化 Resend（從環境變數讀取 API Key）
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    // 開發環境可能尚未設定，記錄警告但不讓使用者看到金鑰資訊
    console.error("[contact API] 缺少 EMAIL_API_KEY 環境變數");
    return NextResponse.json(
      { error: "Email 服務尚未設定，請聯絡系統管理員" },
      { status: 500 }
    );
  }

  const resend = new Resend(apiKey);

  // 收件信箱：社團 Email（設定在環境變數，fallback 為 config 預設值）
  const toEmail = process.env.CONTACT_TO_EMAIL ?? "noreply@rocsaut.ca";
  // TODO: 待 rocsaut.ca domain 在 Resend 驗證後，改回 noreply@rocsaut.ca
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";

  // 5. 發送 Email
  try {
    const { error } = await resend.emails.send({
      from: `ROCSAUT <${fromEmail}>`,
      to: [toEmail],
      // replyTo 設為提交者的 email，讓社團可以直接回覆
      replyTo: `${name} <${email}>`,
      subject: `[ROCSAUT] 聯絡表單訊息 — 來自 ${name}`,
      // HTML 版本：格式化顯示
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
      // 純文字版本：備用
      text: `聯絡表單新訊息\n\n姓名：${name}\nEmail：${email}\n\n訊息：\n${message}`,
    });

    if (error) {
      // Resend 回傳錯誤（例如 API Key 無效、域名未驗證等）
      console.error("[contact API] Resend 發信錯誤：", error);
      return NextResponse.json(
        { error: "發信失敗，請稍後再試" },
        { status: 500 }
      );
    }

    // 6. 成功回傳
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    // 網路錯誤或其他未預期例外
    console.error("[contact API] 未預期錯誤：", err);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}
