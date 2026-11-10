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

// ── Lobby (staff code, choose event): ROCSAUT's own look. Navy and cream from
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

// Remembers that this phone already chose the event, so a reload goes straight to the scanner.
const DOOR_EVENT_KEY = "rocsaut_door_event";

type MarkKind = "check" | "alert" | "cross" | "retry";

const FLOODS: Record<Verdict, { bg: string; fg: string; word: string; mark: MarkKind }> = {
  admit: { bg: DEFAULT_TIER, fg: BONE, word: "ADMIT", mark: "check" },
  duplicate: { bg: "#f0a81a", fg: INK, word: "ALREADY IN", mark: "alert" },
  void: { bg: RED, fg: BONE, word: "VOID", mark: "cross" },
  not_found: { bg: RED, fg: BONE, word: "NOT FOUND", mark: "cross" },
  wrong_event: { bg: RED, fg: BONE, word: "WRONG EVENT", mark: "cross" },
  error: { bg: RED, fg: BONE, word: "TRY AGAIN", mark: "retry" },
};

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
            className={`min-w-0 break-words font-[family-name:var(--font-door-display)] font-black uppercase leading-[0.95] tracking-tight ${main.length > 12 ? "text-[1.85rem]" : "text-[2.5rem]"}`}
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

  const [verified, setVerified] = useState(false);
  // The event this door admits (from the server), and whether staff have entered its scanner.
  const [doorEvent, setDoorEvent] = useState<DoorEvent | null>(null);
  const [entered, setEntered] = useState(false);
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
        if (!response.ok) return;
        const data = await response.json().catch(() => null);
        const event: DoorEvent | null = data?.event ?? null;
        setDoorEvent(event);
        setVerified(true);
        // Reloaded mid-shift: go straight back into the scanner.
        let saved: string | null = null;
        try {
          saved = window.localStorage.getItem(DOOR_EVENT_KEY);
        } catch {
          // Storage blocked: staff just tap the event again.
        }
        if (event && saved === event.id) setEntered(true);
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

      setDoorEvent(data.event ?? null);
      setVerified(true);
      setStaffCode("");
    } catch (err) {
      console.error("Staff verification error:", err);
      setVerificationError("Unable to verify. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const enterEvent = () => {
    if (!doorEvent) return;
    setResult(null);
    setError("");
    setEntered(true);
    try {
      window.localStorage.setItem(DOOR_EVENT_KEY, doorEvent.id);
    } catch {
      // Storage blocked: the choice lasts until the page is reloaded.
    }
  };

  // Back to the event list. The camera stops first: #qr-reader unmounts there.
  const leaveEvent = async () => {
    await stopScanner();
    setEntered(false);
    setResult(null);
    setError("");
    try {
      window.localStorage.removeItem(DOOR_EVENT_KEY);
    } catch {
      // Storage blocked.
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

      const response = await fetch("/api/event/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenFromQr(decodedText) }),
      });

      if (response.status === 401) {
        await stopScanner();
        setVerified(false);
        setEntered(false);
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
    // Stopping ends the result screen: back to the night, last guest kept as "Previous guest".
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
            {verifying ? "Checking…" : "Continue"}
          </button>
        </form>
      </Lobby>
    );
  }

  // Step 2: choose the event (the server decides which one this door admits).
  if (!entered || !doorEvent) {
    const name = doorEvent ? splitTitle(doorEvent.title) : null;

    return (
      <Lobby>
        <p className="mt-8 text-[11px] tracking-[0.3em]" style={{ color: SEAL }}>
          STEP 2 · CHOOSE EVENT
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-door-display)] text-[3.75rem] font-black uppercase leading-[0.85] tracking-tight">
          Tonight&apos;s
          <br />
          door
        </h1>
        <p className="mt-3 text-xs leading-relaxed opacity-70">
          Tickets for any other event show WRONG EVENT and aren&apos;t let in.
        </p>

        {doorEvent && name ? (
          <button
            type="button"
            onClick={enterEvent}
            className="group relative mt-7 block w-full overflow-hidden rounded-md text-left shadow-[0_10px_30px_-14px_rgba(26,39,68,0.6)] transition active:translate-y-px"
            style={{ backgroundColor: NAVY, color: PAPER }}
          >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: SEAL }} />
            <span className="block px-6 py-5">
              <span className="block text-[10px] tracking-[0.3em]" style={{ color: GOLD }}>
                TONIGHT
              </span>
              <span className="mt-2 block break-words font-[family-name:var(--font-door-display)] text-[2.1rem] font-black uppercase leading-[0.9] tracking-tight">
                {name.name}
              </span>
              {name.sub && <span className="mt-1 block text-[11px] tracking-[0.12em] opacity-70">{name.sub}</span>}
              <span className="mt-4 block text-xs tracking-[0.08em]" style={{ color: GOLD }}>
                {formatDoorDate(doorEvent)}
              </span>
              {doorEvent.location && (
                <span className="mt-1 block text-[11px] leading-snug opacity-75">{doorEvent.location}</span>
              )}
            </span>
            <span
              className="flex items-center justify-between border-t border-dashed px-6 py-3 text-[11px] tracking-[0.25em]"
              style={{ borderColor: `${PAPER}33` }}
            >
              OPEN SCANNER
              <span aria-hidden="true" className="text-base transition group-hover:translate-x-1">→</span>
            </span>
          </button>
        ) : (
          <p className="mt-7 border-l-4 pl-3 text-sm leading-relaxed" style={{ borderColor: SEAL }}>
            No event is set for this door. Tell the organizer (HILO_EVENT_ID).
          </p>
        )}
      </Lobby>
    );
  }

  // Step 3: the scanner, in ROCSAUT colours.
  const name = splitTitle(doorEvent.title);
  const verdict = result ? getVerdict(result) : null;
  const tier = getTier(result?.ticket);
  // Valid entry: the whole screen takes the tier colour. Otherwise amber/red.
  const flood = showing && verdict
    ? verdict === "admit"
      ? { ...FLOODS.admit, bg: tier.bg }
      : FLOODS[verdict]
    : null;
  const fg = flood?.fg ?? NAVY;
  const checkedIn = formatCheckedIn(result?.checkedInAt);

  return (
    <main
      className="fixed inset-0 flex overflow-y-auto overflow-x-hidden px-4 py-5 font-[family-name:var(--font-door-mono)] transition-colors duration-500"
      style={{ backgroundColor: flood?.bg ?? PAPER, color: fg }}
    >
      {!flood && <PlumBlossom className="pointer-events-none fixed -bottom-24 -right-24 h-80 w-80 opacity-20" color={GOLD} />}

      {/* m-auto centers when there is room and scrolls instead of clipping on short screens */}
      <div className="relative m-auto flex w-full max-w-md flex-col gap-4">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void leaveEvent()}
            className="-ml-1 px-1 py-1 text-[11px] tracking-[0.25em] underline-offset-4 hover:underline"
            style={{ color: fg, opacity: 0.8 }}
          >
            ← EVENTS
          </button>
          <span className="flex items-center gap-2 text-[10px] tracking-[0.3em]">
            ROCSAUT DOOR
            <Image src="/assets/logo.png" alt="" width={28} height={28} className="rounded-full" />
          </span>
        </header>

        {/* The event this door admits */}
        <div>
          <p className="text-[10px] tracking-[0.3em]" style={{ color: flood ? fg : SEAL }}>
            NOW SCANNING
          </p>
          <h1 className="mt-1 break-words font-[family-name:var(--font-door-display)] text-[2.4rem] font-black uppercase leading-[0.9] tracking-tight">
            {name.name}
          </h1>
          <p className="mt-1.5 truncate text-[11px] tracking-[0.08em] opacity-70">
            {formatDoorDate(doorEvent)}
            {doorEvent.location ? ` · ${doorEvent.location.split(",")[0]}` : ""}
          </p>
          <div aria-hidden="true" className="mt-3 border-y" style={{ borderColor: flood ? `${fg}66` : GOLD, height: 4 }} />
        </div>

        {/* Viewfinder in a navy frame — #qr-reader must always stay mounted for html5-qrcode */}
        {/* Fixed size: html5-qrcode measures its scan area at start, so resizing the box stops it reading codes */}
        <div
          className="relative mx-auto w-full rounded-sm p-[5px]"
          style={{ maxWidth: "min(100%, 34dvh, 340px)", backgroundColor: flood ? `${fg}33` : NAVY }}
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

            {/* Slow check: a red beam sweeps the frame */}
            {checking && scanning && (
              <div
                role="status"
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ backgroundColor: "rgba(26,39,68,0.8)", color: PAPER }}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 h-1 motion-safe:animate-[door-beam_1.1s_ease-in-out_infinite_alternate]"
                  style={{ top: "50%", backgroundColor: SEAL, boxShadow: `0 0 20px 4px ${SEAL}99` }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="font-[family-name:var(--font-door-display)] text-4xl font-black uppercase tracking-wide motion-safe:animate-[door-flicker_2.4s_steps(1)_infinite]">
                    Checking
                  </p>
                  <p className="mt-1 text-[10px] tracking-[0.3em]" style={{ color: GOLD }}>
                    READING THE GUEST LIST…
                  </p>
                </div>
              </div>
            )}

            {/* Camera off: the whole frame is a start button (an overlay, so the layout height never changes) */}
            {!scanning && (
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

        {/* Ticket stub: verdict, or the previous guest while scanning */}
        <section
          aria-live="assertive"
          className="min-h-[11rem] border-t-2 border-dashed pt-4"
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
                <p className="mt-3 break-words text-xl font-semibold">{result.ticket.name}</p>
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
              <p className="mt-6 font-[family-name:var(--font-door-display)] text-3xl font-black uppercase" style={{ color: fg }}>
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
          <p className="border-l-4 pl-3 text-sm" style={{ borderColor: SEAL }}>
            {error}
          </p>
        )}

        {/* Controls: primary action + camera toggle, same footprint in every state */}
        <div className="flex flex-col gap-2">
          {!scanning ? (
            <button
              type="button"
              onClick={() => void startScanner()}
              className="w-full rounded-sm py-4 font-[family-name:var(--font-door-display)] text-3xl font-black uppercase tracking-wide transition active:translate-y-px"
              style={{ backgroundColor: NAVY, color: PAPER }}
            >
              Start scanning
            </button>
          ) : (
            <div
              className="w-full rounded-sm py-4 text-center font-[family-name:var(--font-door-display)] text-3xl font-black uppercase tracking-wide"
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
