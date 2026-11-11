"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { playScanSound, unlockAudio, type ScanSound } from "@/lib/scan-sounds";

type ScanResult = {
  success: boolean;
  status: string;
  message: string;
  checkedInAt?: string;
  // wrong_event: the event this ticket is actually for.
  eventTitle?: string;
  ticket?: {
    name: string;
    tier: string;
    color?: string | null;
    perks?: string | null;
  };
  // Client-side only: which part failed when the check itself couldn't finish.
  failure?: "network" | "server";
  httpStatus?: number;
};

/** The one event this door admits (HILO_EVENT_ID), sent by /api/staff/check-in/verify. */
type DoorEvent = {
  id: string;
  title: string;
  startAt: string;
  location: string | null;
  timezone: string;
};

type Verdict = "admit" | "duplicate" | "void" | "not_found" | "wrong_event" | "error";

// ── Lobby (staff code): ROCSAUT's own look. Navy and cream from
// the logo, a seal red for Taiwan, a plum blossom (梅花) watermark.
const NAVY = "#1a2744";
const PAPER = "#faf8f3";
const GOLD = "#c9b99a";
const SEAL = "#c8102e";

// ── Scanner: the same ROCSAUT look as the lobby for now (a party theme can
// come later). Result floods stay plain state colours (tier colour = in,
// amber = already in, red = no), each with a word and a mark.
const INK = "#12060b";
const BONE = "#f6ecdc";
const RED = "#b3122a";
// Floods a valid entry when the ticket type has no colour of its own.
const DEFAULT_TIER = "#6b21a8";

// Shown on every admit: the party is strictly 19+ (see HILO_EMAIL_NOTES).
const DOOR_NOTE = "Check photo ID · 19+";

type MarkKind = "check" | "alert" | "cross" | "retry" | "wait";

const FLOODS: Record<Verdict, { bg: string; fg: string; word: string; mark: MarkKind }> = {
  admit: { bg: DEFAULT_TIER, fg: BONE, word: "ADMIT", mark: "check" },
  duplicate: { bg: "#f0a81a", fg: INK, word: "ALREADY IN", mark: "alert" },
  void: { bg: RED, fg: BONE, word: "VOID", mark: "cross" },
  not_found: { bg: RED, fg: BONE, word: "NOT FOUND", mark: "cross" },
  wrong_event: { bg: RED, fg: BONE, word: "WRONG EVENT", mark: "cross" },
  error: { bg: RED, fg: BONE, word: "TRY AGAIN", mark: "retry" },
};

// Floods the screen the moment a QR is read, while the server checks it.
// Navy: not a result colour (tier purple, amber, red), so it never reads as one.
const CHECKING_FLOOD = { bg: NAVY, fg: BONE, word: "CHECKING", mark: "wait" as MarkKind };

// A ticket type's own name, perks and colour (TicketType.color floods the screen on entry).
const getTier = (ticket?: ScanResult["ticket"]) => ({
  label: ticket?.tier || "Ticket",
  perks: ticket?.perks || "",
  bg: ticket?.color || DEFAULT_TIER,
});

// What goes in the info box when a check fails.
const failReason = (result: ScanResult): { title: string; detail: string } => {
  switch (result.status) {
    case "void":
      return { title: "Ticket cancelled", detail: "Voided — not valid for entry." };
    case "not_found":
      return { title: "No matching ticket", detail: "Not a ticket for this event." };
    case "wrong_event":
      return {
        title: "Other event",
        detail: `This ticket is for ${result.eventTitle ?? "another event"}. Not valid tonight.`,
      };
    default:
      return result.failure === "network"
        ? { title: "No connection", detail: "Check Wi-Fi or data, then scan again." }
        : {
            title: "Server error",
            detail: `Error ${result.httpStatus ?? ""}. Scan again; if it repeats, tell the organizer.`,
          };
  }
};

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
    case "wrong_event":
      return "wrong_event";
    default:
      return "error";
  }
};

const getSound = (verdict: Verdict): ScanSound =>
  verdict === "admit" ? "success" : verdict === "duplicate" ? "already" : "fail";

// Ticket QRs hold the ticket link (https://<site>/ticket/<token>, any domain,
// with or without a query or locale prefix); older passes hold the bare token.
const tokenFromQr = (text: string) => {
  const raw = text.trim();
  const match = raw.match(/\/ticket\/([^/?#\s]+)/);
  if (!match) return raw;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

// Ignore the same code for this long after it was last read, so a QR still
// held in frame doesn't re-trigger as "already in" while scanning continues.
const SAME_CODE_IGNORE_MS = 2000;

const formatCheckedIn = (iso?: string) => {
  if (!iso) return null;
  const at = new Date(iso);
  const minutes = Math.max(0, Math.round((Date.now() - at.getTime()) / 60000));
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const ago = minutes === 0 ? "just now" : `${minutes} min ago`;
  return `${time} · ${ago}`;
};

const formatDoorDate = (event: DoorEvent) =>
  new Date(event.startAt).toLocaleString("en-CA", {
    timeZone: event.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

// "One More Night in TAIPEI | ROCSAUT Annual Party" → name "One More Night in TAIPEI", sub "ROCSAUT Annual Party".
const splitTitle = (title: string) => {
  const [name, ...rest] = title.split("|").map((part) => part.trim());
  return { name, sub: rest.join(" · ") };
};

// ── Pieces ─────────────────────────────────────────────────────────────────

function Mark({ kind, color }: { kind: MarkKind; color: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={`h-12 w-12 shrink-0 ${kind === "wait" ? "motion-safe:animate-spin" : ""}`}
      fill="none"
      stroke={color}
      strokeWidth="5"
      strokeLinecap="square"
    >
      {kind === "check" && <path d="M8 25l11 11L40 13" />}
      {kind === "cross" && <path d="M11 11l26 26M37 11L11 37" />}
      {kind === "alert" && (
        <>
          <path d="M24 8v22" />
          <path d="M24 38v2" />
        </>
      )}
      {kind === "wait" && (
        <>
          <circle cx="24" cy="24" r="15" strokeOpacity="0.3" />
          <path d="M24 9a15 15 0 0 1 15 15" />
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

// The light info box under the headline: what staff need for this result.
// A coloured bar on the left ties it to the tier (or red for a failure).
function InfoBox({
  accent,
  label,
  main,
  mainColor,
  side,
  detail,
}: {
  accent: string;
  label: string;
  main: string;
  mainColor: string;
  side?: string;
  detail?: string;
}) {
  return (
    <div className="mt-3 flex items-stretch" style={{ backgroundColor: BONE, color: INK }}>
      <span aria-hidden="true" className="w-3 shrink-0" style={{ backgroundColor: accent }} />
      <div className="min-w-0 flex-1 px-3 py-2">
        <p className="text-[10px] font-semibold tracking-[0.3em] opacity-60">{label}</p>
        <div className="flex items-end justify-between gap-3">
          <p
            className={`min-w-0 break-words font-[family-name:var(--font-door-display)] font-black uppercase leading-[0.95] tracking-tight ${main.length > 12 ? "text-[1.7rem]" : "text-[2.2rem]"}`}
            style={{ color: mainColor }}
          >
            {main}
          </p>
          {side && (
            <p className="max-w-[45%] shrink-0 pb-1 text-right font-[family-name:var(--font-door-display)] text-xl font-black uppercase leading-none">
              {side}
            </p>
          )}
        </div>
        {detail && <p className="mt-1 text-xs leading-relaxed">{detail}</p>}
      </div>
    </div>
  );
}

// ROC national flower, drawn in one gold line: the lobby's watermark.
function PlumBlossom({ className, color }: { className?: string; color: string }) {
  return (
    <svg aria-hidden="true" viewBox="-60 -60 120 120" className={className} fill="none" stroke={color} strokeWidth="1.6">
      {[0, 72, 144, 216, 288].map((deg) => (
        <circle key={deg} cx="0" cy="-26" r="22" transform={`rotate(${deg})`} />
      ))}
      <circle cx="0" cy="0" r="7" />
      {[18, 90, 162, 234, 306].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -7V-17" />
          <circle cx="0" cy="-19.5" r="2" />
        </g>
      ))}
    </svg>
  );
}

// Red seal-style stamp, like a name chop (印章).
function Seal({ lines }: { lines: [string, string] }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-12 w-12 shrink-0 -rotate-6 flex-col items-center justify-center rounded-[3px] font-[family-name:var(--font-door-display)] text-[13px] font-black uppercase leading-[1.05] tracking-wide"
      style={{
        backgroundColor: SEAL,
        color: PAPER,
        boxShadow: `inset 0 0 0 2px ${SEAL}, inset 0 0 0 3.5px ${PAPER}`,
      }}
    >
      <span>{lines[0]}</span>
      <span>{lines[1]}</span>
    </span>
  );
}

// The lobby frame: logo, club name, gold rules, plum blossom.
function Lobby({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="fixed inset-0 flex overflow-y-auto overflow-x-hidden px-5 py-8 font-[family-name:var(--font-door-mono)]"
      style={{ backgroundColor: PAPER, color: NAVY }}
    >
      <PlumBlossom className="pointer-events-none fixed -bottom-24 -right-24 h-96 w-96 opacity-25" color={GOLD} />

      <div className="relative m-auto w-full max-w-sm">
        <header className="flex items-center gap-3">
          <Image src="/assets/logo.png" alt="ROCSAUT" width={52} height={52} className="shrink-0 rounded-full" priority />
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-door-display)] text-2xl font-black leading-none tracking-wide">ROCSAUT</p>
            <p className="mt-1 text-[10px] leading-snug tracking-[0.08em] opacity-70">
              Taiwanese Student Association
              <br />
              University of Toronto
            </p>
          </div>
          <Seal lines={["Door", "Check"]} />
        </header>

        <div aria-hidden="true" className="mt-5 border-y" style={{ borderColor: GOLD, height: 4 }} />

        {children}

        <p className="mt-10 text-center text-[10px] tracking-[0.3em] opacity-50">
          TAIWAN <span style={{ color: SEAL }}>✿</span> TORONTO
        </p>
      </div>
    </main>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockRef = useRef(false);
  const lastReadRef = useRef<{ code: string; at: number } | null>(null);
  // Set by a fresh staff sign-in: open the camera as soon as the scanner shows.
  const autoStartRef = useRef(false);

  const [verified, setVerified] = useState(false);
  // The one event this door admits (from the server); null if HILO_EVENT_ID isn't set.
  const [doorEvent, setDoorEvent] = useState<DoorEvent | null>(null);
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
  // True from the moment a QR is read until its result is in: the screen floods navy.
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkExistingVerification = async () => {
      try {
        const response = await fetch("/api/staff/check-in/verify");
        if (!response.ok) return;
        const data = await response.json().catch(() => null);
        setDoorEvent(data?.event ?? null);
        // Reloaded mid-shift: back on the scanner. The camera waits for a tap
        // (sounds can only be unlocked from one).
        setVerified(true);
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

      const event: DoorEvent | null = data.event ?? null;
      setDoorEvent(event);
      setResult(null);
      setError("");
      // Straight into scanning: the camera opens once the scanner is on screen.
      autoStartRef.current = Boolean(event);
      setVerified(true);
      setStaffCode("");
    } catch (err) {
      console.error("Staff verification error:", err);
      setVerificationError("Unable to verify. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Back to the cream scanning screen; the last result stays as "Previous guest".
  const endResult = () => setShowing(false);

  // Every scan outcome comes through here: sound on the RESULT, never on the camera read.
  const showResult = (next: ScanResult) => {
    setResult(next);
    setResultSeq((n) => n + 1);
    setShowing(true);
    playScanSound(getSound(getVerdict(next)));
  };

  const checkIn = async (decodedText: string) => {
    try {
      setError("");

      const response = await fetch("/api/event/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenFromQr(decodedText) }),
      });

      if (response.status === 401) {
        await stopScanner();
        setVerified(false);
        setResult(null);
        setVerificationError("Staff verification expired. Please verify again.");
        return;
      }

      // A server error may not even return JSON (e.g. a crashed function).
      const data: ScanResult | null = await response.json().catch(() => null);
      const known = ["checked_in", "already_checked_in", "void", "not_found", "wrong_event"];

      if (!data || (!response.ok && !known.includes(data.status))) {
        showResult({
          success: false,
          status: "error",
          failure: "server",
          httpStatus: response.status,
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
      // Same render as the result, so the navy goes straight to the result colour.
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

      // QR only (tickets are QR codes): fewer decoders per frame, faster reads.
      // Uses the phone's built-in barcode detector where the browser has one.
      const scanner = new Html5Qrcode("qr-reader", {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          aspectRatio: 1,
          qrbox: (viewWidth, viewHeight) => {
            const size = Math.floor(
              Math.min(viewWidth, viewHeight) * 0.85
            );

            const boundedSize = Math.max(
              120,
              Math.min(300, size)
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

          // A new guest: the screen floods navy right away, before the server is asked.
          scanLockRef.current = true;
          endResult();
          setChecking(true);
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
    // Stopping ends the result screen: back to cream, last guest kept as "Previous guest".
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

  // Fresh sign-in: open the camera now that #qr-reader is on screen.
  useEffect(() => {
    if (!verified || !autoStartRef.current) return;
    autoStartRef.current = false;
    void startScanner();
    // startScanner only reads refs and setters; it runs once per sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  // Step 1: staff code.
  if (!verified) {
    return (
      <Lobby>
        <p className="mt-8 text-[11px] tracking-[0.3em]" style={{ color: SEAL }}>
          ROCSAUT · DOOR CHECK-IN
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-door-display)] text-[3.75rem] font-black uppercase leading-[0.85] tracking-tight">
          Staff
          <br />
          sign-in
        </h1>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            // This tap is the one that opens the scanner: unlock sounds now, while it counts as a tap.
            unlockAudio();
            void verifyStaff();
          }}
          className="mt-8"
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
            style={{ borderColor: NAVY, color: NAVY }}
          />

          {verificationError && (
            <p role="alert" className="mt-4 border-l-4 pl-3 text-sm" style={{ borderColor: SEAL }}>
              {verificationError}
            </p>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="mt-8 w-full rounded-sm py-4 font-[family-name:var(--font-door-display)] text-2xl font-extrabold uppercase tracking-wider transition active:translate-y-px disabled:opacity-50"
            style={{ backgroundColor: NAVY, color: PAPER }}
          >
            {verifying ? "Checking…" : "Start scanning"}
          </button>
        </form>
      </Lobby>
    );
  }

  // Step 2: the scanner. One screen: event, camera, result, controls.
  const name = doorEvent ? splitTitle(doorEvent.title) : null;
  const verdict = result ? getVerdict(result) : null;
  const tier = getTier(result?.ticket);
  // Reading a code: navy. Valid entry: the whole screen takes the tier colour. Otherwise amber/red.
  const flood = checking
    ? CHECKING_FLOOD
    : showing && verdict
      ? verdict === "admit"
        ? { ...FLOODS.admit, bg: tier.bg }
        : FLOODS[verdict]
      : null;
  const fg = flood?.fg ?? NAVY;
  const checkedIn = formatCheckedIn(result?.checkedInAt);

  return (
    <main
      className="fixed inset-0 overflow-y-auto overflow-x-hidden font-[family-name:var(--font-door-mono)] transition-colors duration-150"
      style={{ backgroundColor: flood?.bg ?? PAPER, color: fg }}
    >
      {!flood && <PlumBlossom className="pointer-events-none fixed -bottom-24 -right-24 h-80 w-80 opacity-20" color={GOLD} />}

      {/* Fills the screen; only scrolls on phones too short to fit it all */}
      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col gap-3 px-4 py-4">
        {/* The event this door admits */}
        <header>
          <div className="flex items-center gap-3">
            <Image src="/assets/logo.png" alt="ROCSAUT" width={40} height={40} className="shrink-0 rounded-full" priority />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] tracking-[0.3em]" style={{ color: flood ? fg : SEAL }}>
                ROCSAUT DOOR · NOW SCANNING
              </p>
              {name && doorEvent ? (
                <>
                  <h1 className="mt-0.5 line-clamp-2 break-words font-[family-name:var(--font-door-display)] text-[1.65rem] font-black uppercase leading-[0.9] tracking-tight">
                    {name.name}
                  </h1>
                  <p className="mt-1 truncate text-[11px] tracking-[0.08em] opacity-70">
                    {formatDoorDate(doorEvent)}
                    {doorEvent.location ? ` · ${doorEvent.location.split(",")[0]}` : ""}
                  </p>
                </>
              ) : (
                <h1 className="mt-0.5 font-[family-name:var(--font-door-display)] text-[1.65rem] font-black uppercase leading-[0.9] tracking-tight">
                  No event set
                </h1>
              )}
            </div>
          </div>
          <div aria-hidden="true" className="mt-3 border-y" style={{ borderColor: flood ? `${fg}66` : GOLD, height: 4 }} />
        </header>

        {!doorEvent && (
          <p role="alert" className="border-l-4 pl-3 text-sm leading-relaxed" style={{ borderColor: SEAL }}>
            This door has no event to admit, so nothing can be scanned. Tell the organizer (HILO_EVENT_ID).
          </p>
        )}

        {/* Viewfinder in a navy frame — #qr-reader must always stay mounted for html5-qrcode */}
        {/* Fixed size: html5-qrcode measures its scan area at start, so resizing the box stops it reading codes */}
        <div
          className="relative mx-auto w-full shrink-0 rounded-sm p-[5px]"
          style={{ maxWidth: "min(100%, 31dvh, 320px)", backgroundColor: flood ? `${fg}33` : NAVY }}
        >
          <div className="relative">
            <div
              id="qr-reader"
              className="w-full overflow-hidden bg-black [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover [&_img]:mx-auto"
              style={{ aspectRatio: "1 / 1", minHeight: 0 }}
            />

            {/* Corner brackets */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-2">
              {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "bottom-0 left-0 border-b-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4"].map((pos) => (
                <span key={pos} className={`absolute h-7 w-7 ${pos}`} style={{ borderColor: PAPER }} />
              ))}
            </div>

            {/* Code read, server checking: a red beam sweeps the frame */}
            {checking && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ backgroundColor: "rgba(26,39,68,0.8)" }}
              >
                <span
                  className="absolute inset-x-0 h-1 motion-safe:animate-[door-beam_1.1s_ease-in-out_infinite_alternate]"
                  style={{ top: "50%", backgroundColor: SEAL, boxShadow: `0 0 20px 4px ${SEAL}99` }}
                />
              </div>
            )}

            {/* Camera off: the whole frame is a start button (an overlay, so the layout height never changes) */}
            {!scanning && doorEvent && (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center transition active:scale-[0.99]"
                style={{ color: PAPER }}
              >
                <svg aria-hidden="true" viewBox="0 0 48 48" className="h-11 w-11" fill="none" stroke={PAPER} strokeWidth="3">
                  <path d="M6 16h8l4-6h12l4 6h8v24H6z" strokeLinejoin="round" />
                  <circle cx="24" cy="27" r="7" />
                </svg>
                <span className="font-[family-name:var(--font-door-display)] text-2xl font-black uppercase leading-none tracking-wide">
                  Tap to start
                  <br />
                  scanning
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Ticket stub: checking, verdict, or the previous guest while scanning */}
        <section
          aria-live="assertive"
          className="min-h-[10rem] flex-1 border-t-2 border-dashed pt-3"
          style={{ borderColor: `${fg}66` }}
        >
          {checking ? (
            <div role="status" key={`checking-${resultSeq}`} className="motion-safe:animate-[door-rise_150ms_ease-out]">
              <div className="flex items-center gap-3">
                <Mark kind={CHECKING_FLOOD.mark} color={fg} />
                <p className="font-[family-name:var(--font-door-display)] text-[3.25rem] font-black uppercase leading-[0.85] tracking-tight">
                  {CHECKING_FLOOD.word}
                </p>
              </div>
              <InfoBox
                accent={GOLD}
                label="TICKET READ"
                main="One moment"
                mainColor={NAVY}
                detail="Checking the guest list. Keep the guest here — the result shows in a second."
              />
            </div>
          ) : flood && result && verdict ? (
            <div key={`result-${resultSeq}`} className="motion-safe:animate-[door-rise_250ms_ease-out]">
              <div className="flex items-center gap-3">
                <Mark kind={flood.mark} color={fg} />
                <p className="font-[family-name:var(--font-door-display)] text-[3.25rem] font-black uppercase leading-[0.85] tracking-tight">
                  {flood.word}
                </p>
              </div>

              {verdict === "admit" ? (
                <>
                  <InfoBox accent={tier.bg} label="TICKET" main={tier.label} mainColor={tier.bg} side={tier.perks} />
                  <p
                    className="mt-2 inline-block border-2 px-2 py-1 font-[family-name:var(--font-door-display)] text-lg font-black uppercase tracking-wide"
                    style={{ borderColor: fg }}
                  >
                    {DOOR_NOTE}
                  </p>
                </>
              ) : verdict === "duplicate" ? (
                <InfoBox
                  accent={tier.bg}
                  label="ALREADY SCANNED AT"
                  main={checkedIn?.split(" · ")[0] ?? "Earlier"}
                  mainColor={INK}
                  detail={[checkedIn?.split(" · ")[1], tier.label].filter(Boolean).join(" · ")}
                />
              ) : (
                <InfoBox
                  accent={RED}
                  label="REASON"
                  main={failReason(result).title}
                  mainColor={RED}
                  detail={failReason(result).detail}
                />
              )}

              {result.ticket && (
                <p className="mt-2 break-words text-xl font-semibold">{result.ticket.name}</p>
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
                    {getTier(result.ticket).label.toUpperCase()}
                    {checkedIn ? ` · ${checkedIn}` : ""}
                  </p>
                )}
              </div>
              <p className="mt-5 font-[family-name:var(--font-door-display)] text-3xl font-black uppercase" style={{ color: fg }}>
                {scanning ? "Ready — scan next" : "Camera off"}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-[family-name:var(--font-door-display)] text-[3rem] font-black uppercase leading-[0.85] tracking-tight">
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
              {doorEvent && (
                <p className="mt-3 text-xs leading-relaxed opacity-70">
                  Only tickets for this event get in. Any other shows WRONG EVENT.
                </p>
              )}
            </div>
          )}
        </section>

        {error && (
          <p role="alert" className="border-l-4 pl-3 text-sm" style={{ borderColor: SEAL }}>
            {error}
          </p>
        )}

        {/* Controls, same height in every state. Nothing to tap while a code is being checked. */}
        <div className="flex h-14 shrink-0 items-center justify-center">
          {!scanning ? (
            <button
              type="button"
              onClick={() => void startScanner()}
              disabled={!doorEvent}
              className="h-full w-full rounded-sm font-[family-name:var(--font-door-display)] text-3xl font-black uppercase tracking-wide transition active:translate-y-px disabled:opacity-40"
              style={{ backgroundColor: NAVY, color: PAPER }}
            >
              Start scanning
            </button>
          ) : checking ? (
            <p className="text-xs tracking-[0.25em] opacity-80">CHECKING TICKET…</p>
          ) : (
            <button
              type="button"
              onClick={() => void stopScanner()}
              className="px-3 py-2 text-xs tracking-[0.25em] underline underline-offset-4 opacity-80"
            >
              STOP CAMERA
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
