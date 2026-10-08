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
        badge: "bg-green-600 text-white",
        card: "border-green-300 bg-green-50",
        text: "text-green-800",
      };

    case "STANDARD":
      return {
        badge: "bg-blue-600 text-white",
        card: "border-blue-300 bg-blue-50",
        text: "text-blue-800",
      };

    case "UNLIMITED":
      return {
        badge: "bg-purple-600 text-white",
        card: "border-purple-300 bg-purple-50",
        text: "text-purple-800",
      };

    default:
      return {
        badge: "bg-gray-700 text-white",
        card: "border-gray-300 bg-gray-50",
        text: "text-gray-800",
      };
  }
};

const getTierName = (tier: string) => {
  switch (tier) {
    case "LITE":
      return "LITE";

    case "STANDARD":
      return "STANDARD";

    case "UNLIMITED":
      return "UNLIMITED";

    default:
      return tier;
  }
};

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const scanLockRef = useRef(false);

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
        const response = await fetch("/api/staff/check-in/verify", {
          method: "GET",
        });

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
      setVerificationError(
        "Unable to verify. Please try again."
      );
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
        body: JSON.stringify({
          token,
        }),
      });

      const data = await response.json();

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

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          if (scanLockRef.current) {
            return;
          }

          scanLockRef.current = true;

          await checkIn(decodedText);

          setTimeout(() => {
            scanLockRef.current = false;
          }, SCAN_DELAY);
        },
        () => {
          // Ignore QR scan failures while searching.
        }
      );

      scanningRef.current = true;
      setScanning(true);
    } catch (error) {
      console.error("Scanner error:", error);
      setError(
        "Unable to access the camera. Please allow camera permission and try again."
      );
      scannerRef.current = null;
      scanningRef.current = false;
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    if (!scanner) {
      return;
    }

    try {
      await scanner.stop();
    } catch (error) {
      console.error("Scanner stop error:", error);
    }

    scannerRef.current = null;
    scanningRef.current = false;
    scanLockRef.current = false;
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;

      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  const getResultStyle = () => {
    if (!result) return "";

    if (result.ticket) {
      return getTierStyles(result.ticket.tier).card;
    }

    if (result.status === "already_checked_in") {
      return "border-[#e3c4c4] bg-[#fbf2f2]";
    }

    if (result.status === "void") {
      return "border-gray-300 bg-gray-100";
    }

    return "border-gray-200 bg-gray-50";
  };

  const getResultTextStyle = () => {
    if (!result) return "";

    if (result.success) {
      return "text-[#1a2744]";
    }

    if (result.status === "already_checked_in") {
      return "text-[#8f3030]";
    }

    if (result.status === "void") {
      return "text-gray-700";
    }

    return "text-gray-700";
  };

  if (!verified) {
    return (
      <main className="min-h-screen bg-[#f3f6fa] px-4 py-8">
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1a2744]">
                <span className="text-xl font-bold text-white">
                  R
                </span>
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7a90]">
                ROCSAUT Staff
              </p>

              <h1 className="mt-2 text-2xl font-bold text-[#1a2744]">
                Staff Verification
              </h1>

              <p className="mt-2 text-sm text-[#718096]">
                Enter the staff access code to open event check-in.
              </p>
            </div>

            <div className="rounded-3xl border border-[#dce3ec] bg-white p-6 shadow-sm">
              <label
                htmlFor="staff-code"
                className="block text-sm font-semibold text-[#1a2744]"
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
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    verifyStaff();
                  }
                }}
                placeholder="Enter access code"
                autoComplete="off"
                className="mt-2 w-full rounded-xl border border-[#ccd5e2] bg-white px-4 py-3.5 text-base text-[#1a2744] outline-none transition placeholder:text-[#9aa5b5] focus:border-[#1a2744] focus:ring-2 focus:ring-[#1a2744]/10"
              />

              {verificationError && (
                <div className="mt-4 rounded-xl border border-[#e3c4c4] bg-[#fbf2f2] px-4 py-3">
                  <p className="text-center text-sm font-medium text-[#8f3030]">
                    {verificationError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={verifyStaff}
                disabled={verifying}
                className="mt-5 w-full rounded-xl bg-[#1a2744] px-4 py-3.5 font-semibold text-white transition hover:bg-[#253657] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? "Verifying..." : "Continue"}
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-[#8a96a8]">
              ROCSAUT Halloween Party · Staff Check-in
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f6fa] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1a2744]">
            <span className="text-lg font-bold text-white">R</span>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7a90]">
            ROCSAUT Staff
          </p>

          <h1 className="mt-2 text-2xl font-bold text-[#1a2744]">
            Event Check-in
          </h1>

          <p className="mt-1 text-sm text-[#718096]">
            Scan a ticket QR code to check in
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[#dce3ec] bg-white shadow-sm">
          <div className="relative overflow-hidden bg-[#101827]">
            <div
              id="qr-reader"
              className="min-h-[320px] overflow-hidden"
            />

            {!scanning && !result && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-2xl border border-white/20 bg-black/30 px-5 py-3 text-center backdrop-blur-sm">
                  <p className="text-sm font-medium text-white">
                    Ready to scan
                  </p>

                  <p className="mt-1 text-xs text-white/70">
                    Press Start Scanner below
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            {!scanning ? (
              <button
                type="button"
                onClick={startScanner}
                className="w-full rounded-xl bg-[#1a2744] px-4 py-3.5 font-semibold text-white transition hover:bg-[#253657] active:scale-[0.99]"
              >
                Start Scanner
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="w-full rounded-xl border border-[#ccd5e2] bg-white px-4 py-3.5 font-semibold text-[#1a2744] transition hover:bg-[#f3f6fa]"
              >
                Stop Scanner
              </button>
            )}

            {error && (
              <div className="mt-5 rounded-2xl border border-[#e3c4c4] bg-[#fbf2f2] p-4">
                <p className="text-center text-sm font-medium text-[#8f3030]">
                  {error}
                </p>
              </div>
            )}

            {result && (
              <div
                className={`mt-5 rounded-2xl border p-5 ${getResultStyle()}`}
              >
                <div className="text-center">
                  <p
                    className={`text-lg font-bold tracking-wide ${getResultTextStyle()}`}
                  >
                    {result.message}
                  </p>

                  {result.ticket && (
                    <>
                      <p className="mt-4 text-xl font-bold text-[#1a2744]">
                        {result.ticket.name}
                      </p>

                      <div
                        className={`mx-auto mt-4 flex min-h-[64px] max-w-[280px] items-center justify-center rounded-2xl px-5 py-3 ${getTierStyles(result.ticket.tier).badge}`}
                      >
                        <span className="text-2xl font-black tracking-[0.12em]">
                          {getTierName(result.ticket.tier)}
                        </span>
                      </div>

                      <p
                        className={`mt-3 text-sm font-bold ${getTierStyles(result.ticket.tier).text}`}
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
                    <p className="mt-4 text-xs text-[#718096]">
                      Checked in at{" "}
                      {new Date(
                        result.checkedInAt
                      ).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {scanning && (
              <p className="mt-4 text-center text-xs text-[#8a96a8]">
                Scanner is ready for the next ticket
              </p>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[#8a96a8]">
          ROCSAUT Halloween Party · Staff Check-in
        </p>
      </div>
    </main>
  );
}