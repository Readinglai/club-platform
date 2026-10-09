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
        page: "bg-green-600",
        badge: "bg-green-600 text-white",
        text: "text-green-800",
        light: "bg-green-50",
        border: "border-green-300",
      };
    case "STANDARD":
      return {
        page: "bg-blue-600",
        badge: "bg-blue-600 text-white",
        text: "text-blue-800",
        light: "bg-blue-50",
        border: "border-blue-300",
      };
    case "UNLIMITED":
      return {
        page: "bg-purple-600",
        badge: "bg-purple-600 text-white",
        text: "text-purple-800",
        light: "bg-purple-50",
        border: "border-purple-300",
      };
    default:
      return {
        page: "bg-gray-600",
        badge: "bg-gray-700 text-white",
        text: "text-gray-800",
        light: "bg-gray-50",
        border: "border-gray-300",
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
          qrbox: (viewWidth, viewHeight) => {
            const size = Math.max(
              140,
              Math.min(210, viewWidth - 24, viewHeight - 24)
            );

            return { width: size, height: size };
          },
          aspectRatio: 1,
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
          // Ignore scan failures while searching for a QR code.
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

  // Preserve the ticket color whenever the API returns ticket details.
  const getPageBackground = () => {
    if (!result) return "bg-[#1a2744]";

    if (result.ticket) {
      return getTierStyles(result.ticket.tier).page;
    }

    if (!result.success || result.status === "already_checked_in") {
      return "bg-red-600";
    }

    return "bg-[#1a2744]";
  };

  const getResultCardStyle = () => {
    if (!result) return "";

    if (result.ticket) {
      const styles = getTierStyles(result.ticket.tier);
      return `${styles.border} ${styles.light}`;
    }

    if (!result.success || result.status === "already_checked_in") {
      return "border-red-300 bg-red-50";
    }

    return "border-gray-300 bg-gray-50";
  };

  const getResultTextStyle = () => {
    if (!result) return "";

    if (result.status === "already_checked_in") {
      return "text-red-800";
    }

    if (result.success) {
      return "text-green-800";
    }

    return "text-gray-800";
  };

  const showFailure =
    !!result &&
    (!result.success || result.status === "already_checked_in");

  // Staff verification screen
  if (!verified) {
    return (
      <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-[#1a2744] px-4 py-3">
        <div className="w-full max-w-sm">
          <div className="mb-4 text-center text-white">
            <h1 className="text-3xl font-black tracking-widest">
              ROCSAUT
            </h1>
            <p className="mt-1 text-xs font-medium tracking-[0.2em] text-white/70">
              EVENT CHECK-IN
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verifyStaff();
            }}
            className="rounded-3xl bg-white p-5 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-[#1a2744]">
              Staff Verification
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Enter your staff access code to continue.
            </p>

            <label
              htmlFor="staff-code"
              className="mt-4 block text-sm font-semibold text-[#1a2744]"
            >
              Staff Access Code
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
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 outline-none focus:border-[#1a2744] focus:ring-2 focus:ring-[#1a2744]/20"
            />

            {verificationError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {verificationError}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="mt-4 w-full rounded-xl bg-[#1a2744] px-4 py-3 font-bold text-white disabled:opacity-60"
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
      className={`fixed inset-0 flex items-center justify-center overflow-hidden px-3 py-2 transition-colors duration-300 ${getPageBackground()}`}
    >
      <div className="flex max-h-full w-full max-w-sm flex-col items-center justify-center gap-2">
        {/* Header */}
        <div className="shrink-0 text-center text-white">
          <p className="text-[10px] font-bold tracking-[0.3em] text-white/75">
            ROCSAUT
          </p>
          <h1 className="text-xl font-black tracking-wide">
            EVENT CHECK-IN
          </h1>
        </div>

        {/* Scanner panel */}
        <section className="flex max-h-full w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          {/* Ticket type */}
          <div className="shrink-0 px-4 pb-2 pt-3 text-center">
            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400">
              {result?.ticket
                ? "TICKET TYPE"
                : showFailure
                  ? "CHECK-IN FAILED"
                  : "READY TO SCAN"}
            </p>

            <div
              className={`mt-1.5 flex min-h-10 items-center justify-center rounded-xl px-3 py-2 text-xl font-black tracking-wide ${
                result?.ticket
                  ? ticketStyles?.badge
                  : showFailure
                    ? "bg-red-600 text-white"
                    : "bg-[#1a2744] text-white"
              }`}
            >
              {result?.ticket
                ? getTicketLabel(result.ticket.tier)
                : showFailure
                  ? "INVALID"
                  : "SCAN TICKET"}
            </div>
          </div>

          {/* QR scanner */}
          <div className="mx-3 shrink-0 overflow-hidden rounded-2xl bg-[#101827]">
            <div
              id="qr-reader"
              className="w-full overflow-hidden [&_video]:!w-full [&_video]:!object-cover [&_img]:mx-auto"
              style={{
                height: scanning ? "min(32dvh, 230px)" : "72px",
              }}
            />

            {!scanning && (
              <p className="px-2 py-2 text-center text-[10px] font-medium text-white/60">
                Camera is paused
              </p>
            )}
          </div>

          {/* Result */}
          {result && (
            <div
              aria-live="polite"
              className={`mx-3 mt-2 shrink-0 rounded-xl border p-3 ${getResultCardStyle()}`}
            >
              <p
                className={`text-center text-sm font-black leading-snug ${getResultTextStyle()}`}
              >
                {result.message}
              </p>

              {result.ticket && (
                <>
                  <p className="mt-1 break-words text-center text-lg font-bold text-[#1a2744]">
                    {result.ticket.name}
                  </p>

                  <p
                    className={`mt-1 text-center text-xs font-extrabold ${
                      ticketStyles?.text ?? "text-gray-800"
                    }`}
                  >
                    {result.ticket.tier === "LITE"
                      ? "2 DRINK TICKETS"
                      : result.ticket.tier === "STANDARD"
                        ? "4 DRINK TICKETS"
                        : result.ticket.tier === "UNLIMITED"
                          ? "UNLIMITED DRINKS"
                          : ""}
                  </p>
                </>
              )}

              {result.checkedInAt && (
                <p className="mt-1 text-center text-[10px] text-gray-500">
                  Checked in at{" "}
                  {new Date(result.checkedInAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mx-3 mt-2 shrink-0 rounded-xl border border-red-200 bg-red-50 p-2 text-center text-xs font-semibold text-red-800">
              {error}
            </p>
          )}

          {/* Controls */}
          <div className="shrink-0 p-3">
            {!scanning ? (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="w-full rounded-xl bg-[#1a2744] px-4 py-3 text-sm font-extrabold text-white transition active:scale-[0.98]"
              >
                START SCANNER
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-600 transition active:scale-[0.98]"
              >
                STOP SCANNER
              </button>
            )}
          </div>
        </section>

        <p className="shrink-0 text-center text-[10px] font-medium text-white/80">
          {scanning
            ? "Point the camera at the ticket QR code"
            : "Start the scanner when ready"}
        </p>
      </div>
    </main>
  );
}