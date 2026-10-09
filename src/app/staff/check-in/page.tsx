"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type ScanResult = {
  success: boolean;
  status: string;
  message: string;
  checkedInAt?: string;
  ticket?: {
    name: string;
    tier: string;
  };
};

const SCAN_DELAY = 2000;

const getTierStyles = (tier: string) => {
  switch (tier) {
    case "LITE":
      return {
        page: "bg-emerald-600",
        badge: "bg-emerald-600",
        text: "text-emerald-800",
        light: "bg-emerald-50",
        border: "border-emerald-200",
      };
    case "STANDARD":
      return {
        page: "bg-blue-600",
        badge: "bg-blue-600",
        text: "text-blue-800",
        light: "bg-blue-50",
        border: "border-blue-200",
      };
    case "UNLIMITED":
      return {
        page: "bg-violet-600",
        badge: "bg-violet-600",
        text: "text-violet-800",
        light: "bg-violet-50",
        border: "border-violet-200",
      };
    default:
      return {
        page: "bg-slate-600",
        badge: "bg-slate-600",
        text: "text-slate-800",
        light: "bg-slate-50",
        border: "border-slate-200",
      };
  }
};

const getTicketLabel = (tier: string) => {
  switch (tier) {
    case "LITE":
      return "LITE (2)";
    case "STANDARD":
      return "STANDARD (4)";
    case "UNLIMITED":
      return "UNLIMITED";
    default:
      return "UNKNOWN TICKET";
  }
};

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockRef = useRef(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [verified, setVerified] = useState(false);
  const [staffCode, setStaffCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkExistingVerification = async () => {
      try {
        const response = await fetch("/api/staff/check-in/verify");
        if (response.ok) setVerified(true);
      } catch {
        // No existing verification.
      }
    };

    void checkExistingVerification();
  }, []);

  const verifyStaff = async () => {
    if (!staffCode.trim()) {
      setVerificationError("Please enter the staff access code.");
      return;
    }

    try {
      setVerifying(true);
      setVerificationError("");

      const response = await fetch("/api/staff/check-in/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: staffCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setVerificationError(
          data.message || "Incorrect staff access code."
        );
        return;
      }

      setVerified(true);
      setStaffCode("");
    } catch (err) {
      console.error("Staff verification error:", err);
      setVerificationError("Unable to verify. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const checkIn = async (decodedText: string) => {
    try {
      setError("");

      let token = decodedText.trim();

      try {
        const url = new URL(token);
        const parts = url.pathname.split("/").filter(Boolean);

        if (parts[0] === "ticket" && parts[1]) {
          token = parts[1];
        }
      } catch {
        // QR contains a plain token, so use it directly.
      }

      const response = await fetch("/api/event/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data: ScanResult = await response.json();

      if (response.status === 401) {
        setVerified(false);
        setResult(null);
        setError("Staff verification expired. Please verify again.");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("Check-in error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  const startScanner = async () => {
    try {
      setError("");
      setResult(null);
      scanLockRef.current = false;

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Scanner may already be stopped.
        }

        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          aspectRatio: 1,
          qrbox: (viewWidth, viewHeight) => {
            const size = Math.floor(
              Math.min(viewWidth, viewHeight) * 0.72
            );

            const boundedSize = Math.max(
              120,
              Math.min(220, size)
            );

            return {
              width: boundedSize,
              height: boundedSize,
            };
          },
        },
        async (decodedText) => {
          if (scanLockRef.current) return;

          scanLockRef.current = true;
          await checkIn(decodedText);

          scanTimeoutRef.current = setTimeout(() => {
            scanLockRef.current = false;
          }, SCAN_DELAY);
        },
        () => {
          // Ignore scan failures while searching.
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setError(
        "Unable to access the camera. Please allow camera permission and try again."
      );
      scannerRef.current = null;
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    scanLockRef.current = false;

    if (!scanner) {
      setScanning(false);
      return;
    }

    try {
      await scanner.stop();
    } catch (err) {
      console.error("Scanner stop error:", err);
    }

    scannerRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  // If ticket information exists, always preserve its tier color.
  const getPageBackground = () => {
    if (!result) return "bg-slate-900";

    if (result.ticket) {
      return getTierStyles(result.ticket.tier).page;
    }

    if (!result.success || result.status === "already_checked_in") {
      return "bg-red-600";
    }

    return "bg-slate-900";
  };

  const getResultCardStyle = () => {
    if (!result) return "";

    if (result.ticket) {
      const styles = getTierStyles(result.ticket.tier);
      return `${styles.border} ${styles.light}`;
    }

    if (!result.success || result.status === "already_checked_in") {
      return "border-red-200 bg-red-50";
    }

    return "border-slate-200 bg-slate-50";
  };

  const getResultTextStyle = () => {
    if (!result) return "";

    if (result.status === "already_checked_in") {
      return "text-red-800";
    }

    if (result.success) {
      return "text-emerald-800";
    }

    return "text-slate-800";
  };

  const showFailure =
    !!result &&
    (!result.success || result.status === "already_checked_in");

  if (!verified) {
    return (
      <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-900 px-5 py-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center text-white">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl font-black">
              R
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              ROCSAUT
            </h1>
            <p className="mt-2 text-xs font-semibold tracking-[0.25em] text-slate-400">
              EVENT CHECK-IN
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verifyStaff();
            }}
            className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-slate-900">
              Staff verification
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Enter your staff access code to open the scanner.
            </p>

            <label
              htmlFor="staff-code"
              className="mt-5 block text-sm font-semibold text-slate-700"
            >
              Staff access code
            </label>

            <input
              id="staff-code"
              type="password"
              value={staffCode}
              onChange={(event) => {
                setStaffCode(event.target.value);
                setVerificationError("");
              }}
              placeholder="Enter access code"
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            {verificationError && (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {verificationError}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3.5 font-bold text-white transition hover:bg-slate-700 active:scale-[0.99] disabled:opacity-50"
            >
              {verifying ? "Verifying..." : "Continue"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const ticketTier = result?.ticket?.tier;
  const ticketStyles = ticketTier ? getTierStyles(ticketTier) : null;

  return (
    <main
      className={`fixed inset-0 flex items-center justify-center overflow-hidden px-3 py-3 transition-colors duration-300 sm:px-6 ${getPageBackground()}`}
    >
      <div className="flex max-h-full w-full max-w-md flex-col items-center justify-center gap-3">
        {/* Header */}
        <header className="shrink-0 text-center text-white">
          <p className="text-[10px] font-bold tracking-[0.3em] text-white/70">
            ROCSAUT · STAFF PORTAL
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Ticket Check-in
          </h1>
        </header>

        {/* Main panel */}
        <section className="w-full overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-2xl shadow-black/20">
          {/* Ticket type */}
          <div className="px-5 pb-4 pt-5 text-center sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {result?.ticket
                ? "Ticket category"
                : showFailure
                  ? "Check-in status"
                  : "Ready for scanning"}
            </p>

            <div
              className={`mt-2 flex min-h-14 items-center justify-center rounded-2xl px-4 py-3 text-xl font-black tracking-wide text-white shadow-sm sm:text-2xl ${
                result?.ticket
                  ? ticketStyles?.badge
                  : showFailure
                    ? "bg-red-600"
                    : "bg-slate-900"
              }`}
            >
              {result?.ticket
                ? getTicketLabel(result.ticket.tier)
                : showFailure
                  ? "CHECK-IN FAILED"
                  : "SCAN TICKET"}
            </div>
          </div>

          {/* Square scanner viewport */}
          <div className="mx-auto w-full px-4 sm:px-6">
            <div className="mx-auto w-full overflow-hidden rounded-2xl bg-slate-950 p-1.5 shadow-inner">
              <div
                id="qr-reader"
                className="mx-auto w-full overflow-hidden rounded-xl [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&_img]:mx-auto"
                style={{
                  width: "min(100%, 36dvh, 340px)",
                  aspectRatio: "1 / 1",
                  minHeight: 0,
                }}
              />

              {!scanning && (
                <div className="py-2 text-center text-[11px] font-medium text-slate-400">
                  Camera preview appears here
                </div>
              )}
            </div>
          </div>

          {/* Scan result */}
          {result && (
            <div
              aria-live="polite"
              className={`mx-4 mt-4 rounded-2xl border p-4 sm:mx-6 ${getResultCardStyle()}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                    result.success
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {result.success ? "✓" : "!"}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`break-words text-sm font-bold leading-relaxed ${getResultTextStyle()}`}
                  >
                    {result.message}
                  </p>

                  {result.ticket && (
                    <>
                      <p className="mt-1 break-words text-lg font-extrabold text-slate-900">
                        {result.ticket.name}
                      </p>

                      <p
                        className={`mt-1 text-xs font-bold uppercase tracking-wide ${
                          ticketStyles?.text ?? "text-slate-600"
                        }`}
                      >
                        {result.ticket.tier === "LITE"
                          ? "2 drink tickets"
                          : result.ticket.tier === "STANDARD"
                            ? "4 drink tickets"
                            : result.ticket.tier === "UNLIMITED"
                              ? "Unlimited drinks"
                              : ""}
                      </p>
                    </>
                  )}

                  {result.checkedInAt && (
                    <p className="mt-2 text-[11px] font-medium text-slate-500">
                      Checked in at{" "}
                      {new Date(result.checkedInAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold leading-relaxed text-red-800 sm:mx-6">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="p-4 sm:px-6 sm:pb-5">
            {!scanning ? (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-4 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-700 active:scale-[0.99]"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2" />
                  <rect x="8" y="8" width="8" height="8" rx="1" />
                </svg>
                START SCANNER
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.99]"
              >
                STOP SCANNER
              </button>
            )}
          </div>
        </section>

        <p className="shrink-0 text-center text-[10px] font-medium tracking-wide text-white/80">
          {scanning
            ? "POSITION THE QR CODE INSIDE THE FRAME"
            : "READY WHEN YOU ARE"}
        </p>
      </div>
    </main>
  );
}