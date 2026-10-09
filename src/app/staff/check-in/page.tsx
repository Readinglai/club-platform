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
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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

        if (response.ok) {
          setVerified(true);
        }
      } catch {
        // No existing verification.
      }
    };

    checkExistingVerification();
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: staffCode.trim(),
        }),
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
    } catch (error) {
      console.error("Staff verification error:", error);
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
        headers: {
          "Content-Type": "application/json",
        },
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
    } catch (error) {
      console.error("Check-in error:", error);
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
              160,
              Math.min(220, viewWidth - 32, viewHeight - 32)
            );

            return {
              width: size,
              height: size,
            };
          },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (scanLockRef.current) {
            return;
          }

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
    } catch (error) {
      console.error("Scanner error:", error);
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
    } catch (error) {
      console.error("Scanner stop error:", error);
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

  const getPageBackground = () => {
    if (!result) {
      return "bg-[#1a2744]";
    }

    if (
      result.status === "already_checked_in" ||
      !result.success
    ) {
      return "bg-red-600";
    }

    if (result.ticket) {
      return getTierStyles(result.ticket.tier).page;
    }

    return "bg-gray-600";
  };

  const getResultCardStyle = () => {
    if (!result) {
      return "";
    }

    if (result.success && result.ticket) {
      return `${getTierStyles(result.ticket.tier).border} ${
        getTierStyles(result.ticket.tier).light
      }`;
    }

    if (result.status === "already_checked_in") {
      return "border-red-300 bg-red-50";
    }

    return "border-gray-300 bg-gray-50";
  };

  const getResultTextStyle = () => {
    if (!result) {
      return "";
    }

    if (result.success) {
      return "text-green-800";
    }

    if (result.status === "already_checked_in") {
      return "text-red-800";
    }

    return "text-gray-800";
  };

  // Staff verification screen
  if (!verified) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#1a2744] px-5 py-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center text-white">
            <h1 className="text-3xl font-black tracking-widest">
              ROCSAUT
            </h1>
            <p className="mt-2 text-sm font-medium tracking-[0.2em] text-white/70">
              EVENT CHECK-IN
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verifyStaff();
            }}
            className="rounded-3xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-bold text-[#1a2744]">
              Staff Verification
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Enter your staff access code to continue.
            </p>

            <label
              htmlFor="staff-code"
              className="mt-5 block text-sm font-semibold text-[#1a2744]"
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
              className="mt-5 w-full rounded-xl bg-[#1a2744] px-4 py-3 font-bold text-white transition active:scale-[0.99] disabled:opacity-60"
            >
              {verifying ? "Verifying..." : "Continue"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const ticketTier = result?.ticket?.tier;
  const ticketStyles = ticketTier
    ? getTierStyles(ticketTier)
    : null;

  const showFailure =
    !!result &&
    (!result.success || result.status === "already_checked_in");

  return (
    <main
      className={`flex min-h-[100dvh] items-center justify-center overflow-x-hidden px-4 py-5 transition-colors duration-300 ${getPageBackground()}`}
    >
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Branding */}
        <div className="mb-5 text-center text-white">
          <p className="text-xs font-bold tracking-[0.3em] text-white/70">
            ROCSAUT
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-wide">
            EVENT CHECK-IN
          </h1>
        </div>

        {/* Main scanner panel */}
        <section className="w-full overflow-hidden rounded-3xl bg-white shadow-2xl">
          {/* Ticket type label */}
          <div className="px-5 pb-4 pt-5 text-center">
            <p className="text-xs font-bold tracking-[0.2em] text-gray-400">
              {result?.ticket
                ? "TICKET TYPE"
                : result && showFailure
                  ? "CHECK-IN FAILED"
                  : "READY TO SCAN"}
            </p>

            {result?.ticket ? (
              <div
                className={`mx-auto mt-2 flex min-h-14 items-center justify-center rounded-2xl px-4 py-2 text-2xl font-black tracking-wide ${
                  ticketStyles?.badge ?? "bg-gray-700 text-white"
                }`}
              >
                {getTicketLabel(result.ticket.tier)}
              </div>
            ) : (
              <div className="mt-2 flex min-h-14 items-center justify-center rounded-2xl bg-[#1a2744] px-4 py-2 text-2xl font-black tracking-wide text-white">
                {showFailure ? "INVALID" : "SCAN TICKET"}
              </div>
            )}
          </div>

          {/* Scanner viewport */}
          <div className="mx-4 overflow-hidden rounded-2xl bg-[#101827]">
            <div
              id="qr-reader"
              className="min-h-[240px] overflow-hidden sm:min-h-[280px] [&_video]:!w-full [&_video]:!object-cover [&_img]:mx-auto"
            />

            {!scanning && (
              <div className="px-3 py-3 text-center text-xs font-medium text-white/60">
                Camera is paused
              </div>
            )}
          </div>

          {/* Scan result */}
          {result && (
            <div
              aria-live="polite"
              className={`mx-4 mt-4 rounded-2xl border p-4 ${getResultCardStyle()}`}
            >
              <p
                className={`text-center text-lg font-black leading-snug ${getResultTextStyle()}`}
              >
                {result.message}
              </p>

              {result.ticket && (
                <>
                  <p className="mt-2 break-words text-center text-xl font-bold text-[#1a2744]">
                    {result.ticket.name}
                  </p>

                  <p
                    className={`mt-2 text-center text-sm font-extrabold ${
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
                <p className="mt-2 text-center text-xs text-gray-500">
                  Checked in at{" "}
                  {new Date(result.checkedInAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          )}

          {/* Scanner errors */}
          {error && (
            <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="p-4">
            {!scanning ? (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="w-full rounded-2xl bg-[#1a2744] px-4 py-4 text-base font-extrabold text-white shadow-sm transition active:scale-[0.98]"
              >
                START SCANNER
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition active:scale-[0.98]"
              >
                STOP SCANNER
              </button>
            )}
          </div>
        </section>

        {/* Footer hint */}
        <p className="mt-4 text-center text-xs font-medium text-white/75">
          {scanning
            ? "Point the camera at the ticket QR code"
            : "Start the scanner when ready"}
        </p>
      </div>
    </main>
  );
}