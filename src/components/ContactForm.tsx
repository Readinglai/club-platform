"use client";

/**
 * components/ContactForm.tsx — 聯絡表單（Client Component）
 *
 * 欄位：姓名（name）、Email（email）、訊息（message）
 * 送出後呼叫 POST /api/contact，顯示成功或失敗提示訊息。
 *
 * 使用 React useState 管理表單狀態。
 * 使用 useTranslations("contact") 讀取翻譯文字。
 *
 * 送出流程：
 * 1. 前端基本驗證（欄位不為空）
 * 2. fetch POST /api/contact，body 為 JSON
 * 3. 根據回應狀態顯示成功或失敗訊息
 * 4. 成功後清空表單
 */

import { useState, FormEvent } from "react";
import { useTranslations } from "next-intl";

// 表單欄位型別
interface FormState {
  name: string;
  email: string;
  message: string;
}

// 送出狀態型別
type SubmitStatus = "idle" | "loading" | "success" | "error";

// 主題色
const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

export default function ContactForm() {
  const t = useTranslations("contact");

  // 表單欄位值
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    message: "",
  });

  // 送出狀態：idle | loading | success | error
  const [status, setStatus] = useState<SubmitStatus>("idle");

  // 錯誤訊息（API 回傳的錯誤或網路錯誤）
  const [errorDetail, setErrorDetail] = useState<string>("");

  /**
   * 更新單一欄位值
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * 表單送出處理
   * 1. 阻止預設提交行為
   * 2. 發送 POST /api/contact
   * 3. 更新狀態（success / error）
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorDetail("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        // 送出成功：清空表單、更新狀態
        setStatus("success");
        setForm({ name: "", email: "", message: "" });
      } else {
        // API 回傳非 2xx 狀態碼
        const data = await response.json().catch(() => ({}));
        setErrorDetail(data?.error ?? "");
        setStatus("error");
      }
    } catch {
      // 網路錯誤或其他例外
      setStatus("error");
    }
  };

  const isLoading = status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 w-full max-w-lg mx-auto"
      noValidate
    >
      {/* ── 成功提示 ── */}
      {status === "success" && (
        <div className="rounded-lg p-4 bg-green-50 border border-green-200">
          <p className="font-semibold text-green-800 text-sm">
            {t("successTitle")}
          </p>
          <p className="text-green-700 text-sm mt-1">{t("successMessage")}</p>
        </div>
      )}

      {/* ── 失敗提示 ── */}
      {status === "error" && (
        <div className="rounded-lg p-4 bg-red-50 border border-red-200">
          <p className="font-semibold text-red-800 text-sm">
            {t("errorTitle")}
          </p>
          <p className="text-red-700 text-sm mt-1">
            {errorDetail || t("errorMessage")}
          </p>
        </div>
      )}

      {/* ── 姓名欄位 ── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-name"
          className="text-sm font-medium"
          style={{ color: PRIMARY }}
        >
          {t("nameLabel")}
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          required
          value={form.name}
          onChange={handleChange}
          placeholder={t("namePlaceholder")}
          disabled={isLoading}
          className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all
                     focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed"
          style={
            {
              borderColor: "#d1d5db",
              "--tw-ring-color": `${SECONDARY}88`,
            } as React.CSSProperties
          }
        />
      </div>

      {/* ── Email 欄位 ── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-email"
          className="text-sm font-medium"
          style={{ color: PRIMARY }}
        >
          {t("emailLabel")}
        </label>
        <input
          id="contact-email"
          type="email"
          name="email"
          required
          value={form.email}
          onChange={handleChange}
          placeholder={t("emailPlaceholder")}
          disabled={isLoading}
          className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all
                     focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed"
          style={
            {
              borderColor: "#d1d5db",
              "--tw-ring-color": `${SECONDARY}88`,
            } as React.CSSProperties
          }
        />
      </div>

      {/* ── 訊息欄位 ── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="contact-message"
          className="text-sm font-medium"
          style={{ color: PRIMARY }}
        >
          {t("messageLabel")}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          value={form.message}
          onChange={handleChange}
          placeholder={t("messagePlaceholder")}
          disabled={isLoading}
          className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all
                     resize-y focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed"
          style={
            {
              borderColor: "#d1d5db",
              "--tw-ring-color": `${SECONDARY}88`,
            } as React.CSSProperties
          }
        />
      </div>

      {/* ── 送出按鈕 ── */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200
                   hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: PRIMARY, color: SECONDARY }}
      >
        {isLoading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
