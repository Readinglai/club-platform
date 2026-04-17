/**
 * RegisterPanel.tsx — 活動報名互動元件（Client Component）
 *
 * 報名滿額時直接顯示「名額已滿」。
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const RegistrationStatus = {
  REGISTERED: "REGISTERED",
  CANCELLED: "CANCELLED",
} as const;
type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

const PRIMARY = "#1a2744";
const SECONDARY = "#c9b99a";

interface RegisterPanelProps {
  eventId: string;
  isLoggedIn: boolean;
  initialStatus: RegistrationStatus | null;
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
  const [status, setStatus] = useState<RegistrationStatus | null>(initialStatus);
  const [spots, setSpots] = useState(remainingSpots);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.status as RegistrationStatus);
        if (spots !== null) setSpots((prev) => (prev !== null ? prev - 1 : null));
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

  const handleCancel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setStatus(RegistrationStatus.CANCELLED);
        if (spots !== null) setSpots((prev) => (prev !== null ? prev + 1 : null));
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

  if (status === RegistrationStatus.REGISTERED) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium text-center"
          style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
        >
          已成功報名
        </div>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
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

  // 未報名或已取消
  const isFull = spots !== null && spots <= 0;

  if (isFull) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium text-center"
          style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
        >
          名額已滿
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {spots !== null && (
        <p className="text-xs text-center" style={{ color: "#9ca3af" }}>
          剩餘名額：
          <span className="font-semibold" style={{ color: PRIMARY }}>
            {spots}
          </span>
        </p>
      )}
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: PRIMARY, color: SECONDARY }}
      >
        {loading ? "處理中…" : "立即報名"}
      </button>
    </div>
  );
}
