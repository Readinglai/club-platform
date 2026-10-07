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

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);
  const scanLockRef = useRef(false);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");

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
            setResult(null);
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

    if (result.success) {
      return "border-[#c8d8ec] bg-[#eef4fb]";
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

                      <span className="mt-2 inline-block rounded-full bg-[#1a2744] px-3 py-1 text-xs font-bold tracking-wide text-white">
                        {result.ticket.tier}
                      </span>
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