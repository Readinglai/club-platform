/**
 * RegisterPanel.tsx — 活動報名互動元件（Client Component）
 *
 * 報名滿額時直接顯示「名額已滿」。
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("events");
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
        {t("loginToRegister")}
      </Link>
    );
  }

  if (initialStatus === null && status === null) {
    return (
      <div
        className="mt-6 rounded-lg px-4 py-3 text-xs text-center"
        style={{ backgroundColor: "#f3f4f6", color: "#9ca3af" }}
      >
        {t("registrationComingSoonShort")}
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
        setError(data.error ?? t("registerError"));
      }
    } catch {
      setError(t("networkError"));
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
        setError(data.error ?? t("cancelError"));
      }
    } catch {
      setError(t("networkError"));
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
          {t("registrationSuccess")}
        </div>
        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all hover:opacity-80 disabled:opacity-50"
          style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
        >
          {loading ? t("processing") : t("cancelRegistration")}
        </button>
      </div>
    );
  }

  const isFull = spots !== null && spots <= 0;

  if (isFull) {
    return (
      <div className="mt-6 flex flex-col gap-3">
        <div
          className="rounded-lg px-4 py-3 text-sm font-medium text-center"
          style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
        >
          {t("registrationFull")}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {spots !== null && (
        <p className="text-xs text-center" style={{ color: "#9ca3af" }}>
          {t("remainingSpots")}
          <span className="font-semibold" style={{ color: PRIMARY }}>
            {spots}
          </span>
        </p>
      )}
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <button
        type="button"
        onClick={handleRegister}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: PRIMARY, color: SECONDARY }}
      >
        {loading ? t("processing") : t("register")}
      </button>
    </div>
  );
}
