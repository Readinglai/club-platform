"use client";

import { useState } from "react";
import QRScanner from "./QRScanner";

interface Props {
  eventId: string;
}

interface CheckInResult {
  result: "checked_in" | "already_checked_in" | "denied" | "error";
  reason?: string;
  member?: {
    name: string | null;
    email: string;
  };
  attendedAt?: string;
}

export default function CheckInPanel({ eventId }: Props) {
  const [memberCode, setMemberCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);

  async function handleCheckIn(code: string) {
    const trimmedCode = code.trim();

    if (!trimmedCode || loading) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        `/api/admin/events/${eventId}/check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            memberCode: trimmedCode,
          }),
        }
      );

      const data = await res.json();

      console.log("CHECK-IN RESPONSE:", data);

      if (data.result === "checked_in") {
        setResult({
          result: "checked_in",
          member: data.member,
          attendedAt: data.attendedAt,
        });
      } else if (data.result === "already_checked_in") {
        setResult({
          result: "already_checked_in",
          member: data.member,
          attendedAt: data.attendedAt,
        });
      } else if (data.result === "denied") {
        setResult({
          result: "denied",
          reason: data.reason,
          member: data.member,
        });
      } else {
        setResult({
          result: "error",
          reason: data.error ?? "Something went wrong",
        });
      }

      setMemberCode("");
    } catch (error) {
      console.error("CHECK-IN ERROR:", error);

      setResult({
        result: "error",
        reason:
          error instanceof Error
            ? error.message
            : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleScan(value: string) {
    if (loading) {
      return;
    }

    setMemberCode(value);
    void handleCheckIn(value);
  }

  async function handleManualCheckIn(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    await handleCheckIn(memberCode);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="mb-5">
        <QRScanner onScan={handleScan} />
      </div>

      <form
        onSubmit={handleManualCheckIn}
        className="flex gap-3"
      >
        <input
          value={memberCode}
          onChange={(e) => setMemberCode(e.target.value)}
          placeholder="Enter member code"
          className="flex-1 border border-gray-300 bg-gray-50 text-gray-900 placeholder:text-gray-500 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2"
        />

        <button
          type="submit"
          disabled={loading || !memberCode.trim()}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
          style={{ backgroundColor: "#1a2744" }}
        >
          {loading ? "Checking..." : "Check in"}
        </button>
      </form>

      {result?.result === "checked_in" && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3">
          <p className="font-semibold text-green-700">
            ✓ Checked in
          </p>
          <p className="text-sm text-green-700 mt-1">
            {result.member?.name} · {result.member?.email}
          </p>
        </div>
      )}

      {result?.result === "already_checked_in" && (
        <div className="mt-4 rounded-lg bg-yellow-50 px-4 py-3">
          <p className="font-semibold text-yellow-700">
            Already checked in
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            {result.member?.name} · {result.member?.email}
          </p>
        </div>
      )}

      {result?.result === "denied" && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3">
          <p className="font-semibold text-red-700">
            Check-in denied
          </p>
          <p className="text-sm text-red-700 mt-1">
            {result.reason}
          </p>
        </div>
      )}

      {result?.result === "error" && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3">
          <p className="font-semibold text-red-700">
            Something went wrong
          </p>
          <p className="text-sm text-red-700 mt-1">
            {result.reason}
          </p>
        </div>
      )}
    </div>
  );
}