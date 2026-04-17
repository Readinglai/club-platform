/**
 * RegisterPanel.tsx — 活動報名互動元件（Client Component）
 *
 * 功能：顯示報名狀態、剩餘名額，並處理報名／取消報名操作
 * 輸入（props）：
 *   eventId       — 活動 ID
 *   isLoggedIn    — 使用者是否已登入
 *   initialStatus — 初始報名狀態（null 表示活動不在資料庫或使用者未登入）
 *   remainingSpots — 剩餘名額（null 表示不限名額）
 *   locale        — 當前語系（用於登入連結）
 * 輸出：報名操作 UI
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 本地定義 enum 值，避免在 Client Component 中 import Prisma（含 node:module）
const RegistrationStatus = {
  REGISTERED: "REGISTERED",
  WAITLISTED: "WAITLISTED",
  CANCELLED: "CANCELLED",
} as const;
type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface RegisterPanelProps {
  eventId: string;
  isLoggedIn: boolean;
  /** null 表示活動尚未建立於資料庫，無法報名 */
  initialStatus: RegistrationStatus | null;
  /** null 表示不限名額 */
  remainingSpots: number | null;
  locale: string;
}

export function RegisterPanel({
  eventId,
  isLoggedIn,
  initialStatus,
  remainingSpots,
  locale,
}: RegisterPanelProps) {
  const [status, setStatus] = useState<RegistrationStatus | null>(
    initialStatus
  );
  const [spots, setSpots] = useState(remainingSpots);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 未登入：顯示登入提示
  if (!isLoggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=/${locale}/events/${eventId}`}
        className="mt-6 block w-full py-3 rounded-xl text-sm font-semibold text-center transition-all hover:opacity-90"
        style={{ backgroundColor: PRIMARY, color: SECONDARY }}
      >
        請登入後報名
      </Link>
    );
  }

  // 活動尚未建立於資料庫
  if (initialStatus === null && status === null) {
    return (
      <div
        className="mt-6 rounded-lg px-4 py-3 text-xs text-center"
        style={{ backgroundColor: "#f3f4f6", color: "#9ca3af" }}
      >
        報名功能即將推出
      </div>
    );
  }

  /** 報名 */
  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.status as RegistrationStatus);
        if (data.status === RegistrationStatus.REGISTERED && spots !== null) {
          setSpots((prev) => (prev !== null ? prev - 1 : null));
        }
        router.refresh();
      } else {
        setError(data.error ?? "報名失敗，請稍後再試");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  /** 取消報名 */
  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(RegistrationStatus.CANCELLED);
        if (spots !== null) {
          setSpots((prev) => (prev !== null ? prev + 1 : null));
        }
        router.refresh();
      } else {
        setError(data.error ?? "取消失敗，請稍後再試");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  // 已報名
  if (status === RegistrationStatus.REGISTERED) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium text-center"
          style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
        >
          已成功報名
        </div>
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
        >
          {loading ? "處理中…" : "取消報名"}
        </button>
      </div>
    );
  }

  // 候補中
  if (status === RegistrationStatus.WAITLISTED) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium text-center"
          style={{ backgroundColor: "#fef9c3", color: "#ca8a04" }}
        >
          候補中（名額釋出時將依序通知）
        </div>
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
        >
          {loading ? "處理中…" : "取消候補"}
        </button>
      </div>
    );
  }

  // 未報名或已取消
  const isFull = spots !== null && spots <= 0;
  return (
    <div className="mt-6 flex flex-col gap-3">
      {spots !== null && (
        <p className="text-xs text-center" style={{ color: "#9ca3af" }}>
          剩餘名額：
          <span
            className="font-semibold"
            style={{ color: isFull ? "#ef4444" : PRIMARY }}
          >
            {spots}
          </span>
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: PRIMARY, color: SECONDARY }}
      >
        {loading ? "處理中…" : isFull ? "加入候補" : "立即報名"}
      </button>
    </div>
  );
}
