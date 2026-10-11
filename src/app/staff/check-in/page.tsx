"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { playScanSound, unlockAudio, type ScanSound } from "@/lib/scan-sounds";

type ScanResult = {
  success: boolean;
  status: string;
  message: string;
  checkedInAt?: string;
  ticket?: {
    name: string;
    tier: string;
  };
  // Client-side only: which part failed when the check itself couldn't finish.
  failure?: "network" | "server";
};

type Verdict = "admit" | "duplicate" | "void" | "not_found" | "error";

// Palette: warm ink + bone, one ember accent. Result floods are functional
// state colours, always paired with a word and a shape.
const INK = "#100e0b";
const BONE = "#efe8da";
const EMBER = "#ff5f1f";

type MarkKind = "check" | "alert" | "cross" | "retry";

// Colour follows the sound: green = success, amber = already, red = fail.
const FLOODS: Record<Verdict, { bg: string; fg: string; word: string; mark: MarkKind }> = {
  admit: { bg: "#0a6e3c", fg: BONE, word: "ADMIT", mark: "check" },
  duplicate: { bg: "#f0a81a", fg: INK, word: "ALREADY IN", mark: "alert" },
  void: { bg: "#b3122a", fg: BONE, word: "VOID", mark: "cross" },
  not_found: { bg: "#b3122a", fg: BONE, word: "NOT FOUND", mark: "cross" },
  error: { bg: "#b3122a", fg: BONE, word: "TRY AGAIN", mark: "retry" },
};

const TIERS: Record<string, { label: string; perk: string; chip: string }> = {
  LITE: { label: "LITE", perk: "2 drink tickets", chip: "#059669" },
  STANDARD: { label: "STANDARD", perk: "4 drink tickets", chip: "#2563eb" },
  UNLIMITED: { label: "UNLIMITED", perk: "Unlimited drinks", chip: "#7c3aed" },
};

// Fine film grain so the dark booth isn't a flat fill.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

const getVerdict = (result: ScanResult): Verdict => {
  switch (result.status) {
    case "checked_in":
      return "admit";
    case "already_checked_in":
      return "duplicate";
    case "void":
      return "void";
    case "not_found":
      return "not_found";
    default:
      return "error";
  }
};

const getSound = (verdict: Verdict): ScanSound =>
  verdict === "admit" ? "success" : verdict === "duplicate" ? "already" : "fail";

// Ignore the same code for this long after it was last read, so a QR still
// held in frame doesn't re-trigger as "already in" while scanning continues.
const SAME_CODE_IGNORE_MS = 2000;
// Only show "Checking…" if the API is slow, to avoid a flash on every scan.
const CHECKING_DELAY_MS = 500;

const formatCheckedIn = (iso?: string) => {
  if (!iso) return null;
  const at = new Date(iso);
  const minutes = Math.max(0, Math.round((Date.now() - at.getTime()) / 60000));
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const ago = minutes === 0 ? "just now" : `${minutes} min ago`;
  return `${time} · ${ago}`;
};

function Mark({ kind, color }: { kind: MarkKind; color: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-14 w-14 shrink-0" fill="none" stroke={color} strokeWidth="5" strokeLinecap="square">
      {kind === "check" && <path d="M8 25l11 11L40 13" />}
      {kind === "cross" && <path d="M11 11l26 26M37 11L11 37" />}
      {kind === "alert" && (
        <>
          <path d="M24 8v22" />
          <path d="M24 38v2" />
        </>
      )}
      {kind === "retry" && (
        <>
          <path d="M38 24a14 14 0 1 1-4.1-9.9" />
          <path d="M36 6v9h-9" />
        </>
      )}
    </svg>
  );
}

// On ADMIT the tier is what staff act on (drinks / wristband), so it gets
// a band as heavy as the verdict. Bone background keeps it distinct from the green flood.
function TierBand({ tier }: { tier: string }) {
  const t = TIERS[tier] ?? { label: tier || "UNKNOWN", perk: "", chip: "#475569" };
  return (
    <div className="mt-3 flex items-stretch" style={{ backgroundColor: BONE, color: t.chip }}>
      <span aria-hidden="true" className="w-3 shrink-0" style={{ backgroundColor: t.chip }} />
      <div className="flex flex-1 items-baseline justify-between gap-3 px-3 py-2">
        <p className="font-[family-name:var(--font-door-display)] text-[2.75rem] font-black uppercase leading-none tracking-tight">
          {t.label}
        </p>
        <p className="text-right text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: INK }}>
          {t.perk}
        </p>
      </div>
    </div>
  );
}

function TierChip({ tier }: { tier: string }) {
  const t = TIERS[tier] ?? { label: tier || "UNKNOWN", perk: "", chip: "#475569" };
  return (
    <span
      className="inline-flex items-center gap-2 border-2 px-2.5 py-1 font-[family-name:var(--font-door-mono)] text-xs font-semibold tracking-[0.18em]"
      style={{ backgroundColor: t.chip, borderColor: BONE, color: "#fff" }}
    >
      {t.label}
    </span>
  );
}

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockRef = useRef(false);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);

  const [verified, setVerified] = useState(false);
  const [staffCode, setStaffCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState("");

  const [scanning, setScanning] = useState(false);
  // True while a result floods the screen. It stays until the next code is read
  // or the camera is stopped; scanning keeps running underneath.
  const [showing, setShowing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  // Bumped per result so its entrance + countdown animations restart.
  const [resultSeq, setResultSeq] = useState(0);
  const [checking, setChecking] = useState(false);
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

  // Back to the black scanning screen; the last result stays as "Previous guest".
  const endResult = () => setShowing(false);

  // Every scan outcome comes through here: sound on the RESULT, never on the camera read.
  const showResult = (next: ScanResult) => {
    setResult(next);
    setResultSeq((n) => n + 1);
    setShowing(true);
    playScanSound(getSound(getVerdict(next)));
  };

  const checkIn = async (decodedText: string) => {
    const checkingTimer = setTimeout(() => setChecking(true), CHECKING_DELAY_MS);

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

      if (response.status === 401) {
        setVerified(false);
        setResult(null);
        setError("Staff verification expired. Please verify again.");
        return;
      }

      // A server error may not even return JSON (e.g. a crashed function).
      const data: ScanResult | null = await response.json().catch(() => null);
      const known = ["checked_in", "already_checked_in", "void", "not_found"];

      if (!data || (!response.ok && !known.includes(data.status))) {
        showResult({
          success: false,
          status: "error",
          failure: "server",
          message: `Server error (${response.status})${data?.message ? `: ${data.message}` : ""}. Scan again; if it repeats, tell the organizer.`,
        });
        return;
      }

      showResult(data);
    } catch (err) {
      // fetch itself threw: the request never got an answer.
      console.error("Check-in error:", err);
      showResult({
        success: false,
        status: "error",
        failure: "network",
        message: "No connection. Check Wi-Fi or mobile data, then scan again.",
      });
    } finally {
      clearTimeout(checkingTimer);
      setChecking(false);
    }
  };

  const startScanner = async () => {
    // Must run synchronously inside the tap, before any await (mobile audio rule).
    unlockAudio();

    try {
      setError("");
      // Keep the last scanned guest on screen as "Previous guest".
      endResult();
      scanLockRef.current = false;

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
              Math.min(viewWidth, viewHeight) * 0.8
            );

            const boundedSize = Math.max(
              120,
              Math.min(280, size)
            );

            return {
              width: boundedSize,
              height: boundedSize,
            };
          },
        },
        async (decodedText) => {
          // Track every read so a code held in frame stays ignored.
          const now = Date.now();
          const last = lastReadRef.current;
          lastReadRef.current = { code: decodedText, at: now };
          if (last && last.code === decodedText && now - last.at < SAME_CODE_IGNORE_MS) return;

          if (scanLockRef.current) return;

          // A new guest: drop the old result so the previous guest shows until this one's result is in.
          endResult();
          scanLockRef.current = true;
          await checkIn(decodedText);
          scanLockRef.current = false;
        },
        () => {
          // Ignore scan failures while searching.
        }
      );

      setScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      setError(
        "Camera blocked. Allow camera access and try again."
      );
      scannerRef.current = null;
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;

    scanLockRef.current = false;
    // Stopping ends the result screen: back to black, last guest kept as "Previous guest".
    endResult();

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
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  if (!verified) {
    return (
      <main
        className="fixed inset-0 flex overflow-y-auto px-5 py-6 font-[family-name:var(--font-door-mono)]"
        style={{ backgroundColor: INK, color: BONE }}
      >
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-[0.07] mix-blend-screen" style={{ backgroundImage: GRAIN }} />

        <div className="relative m-auto w-full max-w-sm">
          <p className="text-[11px] tracking-[0.35em]" style={{ color: EMBER }}>
            ROCSAUT · HALLOWEEN 2026
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-door-display)] text-[4.5rem] font-black uppercase leading-[0.82] tracking-tight">
            Door
            <br />
            Check-in
          </h1>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void verifyStaff();
            }}
            className="mt-10 border-t-2 border-dashed pt-6"
            style={{ borderColor: `${BONE}55` }}
          >
            <label htmlFor="staff-code" className="block text-xs tracking-[0.2em] opacity-70">
              STAFF ACCESS CODE
            </label>

            <input
              id="staff-code"
              type="password"
              value={staffCode}
              onChange={(event) => {
                setStaffCode(event.target.value);
                setVerificationError("");
              }}
              placeholder="••••••"
              autoComplete="off"
              className="mt-3 w-full border-b-2 bg-transparent pb-2 text-2xl tracking-[0.3em] outline-none placeholder:opacity-30"
              style={{ borderColor: BONE, color: BONE }}
            />

            {verificationError && (
              <p className="mt-4 border-l-4 pl-3 text-sm" style={{ borderColor: EMBER, color: BONE }}>
                {verificationError}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="mt-8 w-full py-4 font-[family-name:var(--font-door-display)] text-2xl font-extrabold uppercase tracking-wider transition active:translate-y-px disabled:opacity-50"
              style={{ backgroundColor: EMBER, color: INK }}
            >
              {verifying ? "Checking…" : "Open scanner"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const verdict = result ? getVerdict(result) : null;
  const flood = showing && verdict ? FLOODS[verdict] : null;
  const fg = flood?.fg ?? BONE;
  const checkedIn = formatCheckedIn(result?.checkedInAt);

  return (
    <main
      className="fixed inset-0 flex overflow-y-auto px-4 py-4 font-[family-name:var(--font-door-mono)] transition-colors duration-500"
      style={{ backgroundColor: flood?.bg ?? INK, color: fg }}
    >
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 opacity-[0.07] mix-blend-screen" style={{ backgroundImage: GRAIN }} />

      {/* m-auto centers when there is room and scrolls instead of clipping on short screens */}
      <div className="relative m-auto flex w-full max-w-md flex-col gap-4">
        {/* Masthead */}
        <header className="flex items-end justify-between">
          <h1 className="font-[family-name:var(--font-door-display)] text-3xl font-black uppercase leading-none tracking-tight">
            Door
          </h1>
          <p className="text-[10px] tracking-[0.3em]" style={{ color: flood ? fg : EMBER }}>
            ROCSAUT · HALLOWEEN 2026
          </p>
        </header>

        {/* Viewfinder — #qr-reader must always stay mounted for html5-qrcode */}
        {/* Fixed size: html5-qrcode measures its scan area at start, so resizing the box stops it reading codes */}
        <div className="relative mx-auto w-full" style={{ maxWidth: "min(100%, 34dvh, 340px)" }}>
          <div
            id="qr-reader"
            className="w-full overflow-hidden bg-black [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&_img]:mx-auto"
            style={{ aspectRatio: "1 / 1", minHeight: 0 }}
          />

          {/* Corner brackets */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"].map((pos) => (
              <span key={pos} className={`absolute h-7 w-7 ${pos}`} style={{ borderColor: flood ? fg : EMBER }} />
            ))}
          </div>

          {/* Slow check: ember beam sweeps the frame like candlelight over a guest list */}
          {checking && scanning && (
            <div
              role="status"
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ backgroundColor: "rgba(16,14,11,0.72)", color: BONE }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 h-1 motion-safe:animate-[door-beam_1.1s_ease-in-out_infinite_alternate]"
                style={{ top: "50%", backgroundColor: EMBER, boxShadow: `0 0 24px 6px ${EMBER}99` }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="font-[family-name:var(--font-door-display)] text-4xl font-black uppercase tracking-wide motion-safe:animate-[door-flicker_2.4s_steps(1)_infinite]">
                  Checking
                </p>
                <p className="mt-1 text-[10px] tracking-[0.3em]" style={{ color: EMBER }}>
                  READING THE GUEST LIST…
                </p>
              </div>
            </div>
          )}

          {/* Overlay (not an extra row) so the layout height never changes */}
          {!scanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-[11px] tracking-[0.25em]" style={{ color: BONE }}>
              CAMERA OFF
            </div>
          )}
        </div>

        {/* Ticket stub: verdict, or the previous guest while scanning */}
        <section
          aria-live="assertive"
          className="min-h-[11.5rem] border-t-2 border-dashed pt-4"
          style={{ borderColor: `${fg}66` }}
        >
          {flood && result && verdict ? (
            <div key={`result-${resultSeq}`} className="motion-safe:animate-[door-rise_250ms_ease-out]">
              <div className="flex items-center gap-3">
                <Mark kind={flood.mark} color={fg} />
                <p className="font-[family-name:var(--font-door-display)] text-[3.75rem] font-black uppercase leading-[0.85] tracking-tight">
                  {flood.word}
                </p>
              </div>

              {result.ticket && verdict === "admit" ? (
                <>
                  <TierBand tier={result.ticket.tier} />
                  <p className="mt-3 break-words text-xl font-semibold">{result.ticket.name}</p>
                </>
              ) : result.ticket ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <p className="break-words text-xl font-semibold">{result.ticket.name}</p>
                  <TierChip tier={result.ticket.tier} />
                </div>
              ) : (
                <>
                  {result.failure && (
                    <p className="mt-4 inline-block px-2 py-1 text-xs font-semibold tracking-[0.3em]" style={{ backgroundColor: fg, color: flood.bg }}>
                      {result.failure === "network" ? "NETWORK PROBLEM" : "SERVER PROBLEM"}
                    </p>
                  )}
                  <p className="mt-3 text-sm leading-relaxed">{result.message}</p>
                </>
              )}

              {verdict === "duplicate" && (
                <p className="mt-3 text-lg font-semibold">
                  Checked in {checkedIn ?? "earlier"}
                </p>
              )}
            </div>
          ) : result ? (
            <div key={`previous-${resultSeq}`} className="motion-safe:animate-[door-rise_400ms_ease-out]">
              <div className="opacity-70">
              <p className="text-[10px] tracking-[0.3em]">PREVIOUS GUEST</p>
              <p className="mt-2 text-base">
                {result.ticket ? `${result.ticket.name} — ` : ""}
                {verdict ? FLOODS[verdict].word : result.message}
              </p>
              {result.ticket && (
                <p className="mt-1 text-xs tracking-[0.2em]">
                  {TIERS[result.ticket.tier]?.label ?? result.ticket.tier}
                  {checkedIn ? ` · ${checkedIn}` : ""}
                </p>
              )}
              </div>
              <p className="mt-6 font-[family-name:var(--font-door-display)] text-3xl font-black uppercase" style={{ color: BONE }}>
                {checking && scanning ? "Checking…" : scanning ? "Ready — scan next" : "Camera off"}
              </p>
            </div>
          ) : (
            <p className="font-[family-name:var(--font-door-display)] text-[3.25rem] font-black uppercase leading-[0.85] tracking-tight">
              {scanning ? (
                <>
                  Point at
                  <br />
                  ticket QR
                </>
              ) : (
                <>
                  Ready at
                  <br />
                  the door
                </>
              )}
            </p>
          )}
        </section>

        {error && (
          <p className="border-l-4 pl-3 text-sm" style={{ borderColor: EMBER }}>
            {error}
          </p>
        )}

        {/* Controls: primary action + camera toggle, same footprint in every state */}
        <div className="flex flex-col gap-2">
          {!scanning ? (
            <button
              type="button"
              onClick={() => void startScanner()}
              className="w-full py-4 font-[family-name:var(--font-door-display)] text-3xl font-black uppercase tracking-wide transition active:translate-y-px"
              style={{ backgroundColor: EMBER, color: INK }}
            >
              Start scanner
            </button>
          ) : (
            <div
              className="w-full py-4 text-center font-[family-name:var(--font-door-display)] text-3xl font-black uppercase tracking-wide"
              style={{ boxShadow: `inset 0 0 0 2px ${fg}55` }}
            >
              Scanning…
            </div>
          )}

          {/* Only "Stop camera" is needed here; Start lives in the big button. Kept invisible (not removed) so the layout doesn't shift. */}
          <button
            type="button"
            onClick={() => void stopScanner()}
            disabled={!scanning}
            className={`self-center px-3 py-2 text-xs tracking-[0.25em] underline underline-offset-4 opacity-80 ${scanning ? "" : "invisible"}`}
          >
            STOP CAMERA
          </button>
        </div>
      </div>
    </main>
  );
}
