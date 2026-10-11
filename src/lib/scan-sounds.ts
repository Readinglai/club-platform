// scan-sounds.ts — soft door check-in tones for ROCSAUT ticket scanning.
// Pure Web Audio: no audio files to host or preload.
//
// The meaning is in the melody, not the harshness:
//   success → two notes going UP   (G5 → C6)
//   already → same note TWICE      (E5, E5)
//   fail    → two notes going DOWN, an uneasy interval (A4 → E♭4, drooping)
//
// Usage:
//   import { unlockAudio, playScanSound } from "@/lib/scan-sounds";
//   unlockAudio();            // must run from a user tap (iOS/Android rule)
//   playScanSound("success"); // "success" | "already" | "fail"

export type ScanSound = "success" | "already" | "fail";

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | undefined;

/** Call from a user gesture (e.g. a "Start scanner" button) before the first scan. */
export function unlockAudio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
}

// One soft, bell-like note: sine + a quiet octave, fast attack, smooth decay.
function note(
  audio: AudioContext,
  freq: number,
  start: number,
  dur: number,
  { vol = 0.5, slideTo }: { vol?: number; slideTo?: number } = {}
) {
  const t = audio.currentTime + start;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  gain.connect(audio.destination);

  const partials: Array<[number, number]> = [
    [1, 1],
    [2, 0.15],
  ];

  partials.forEach(([mult, level]) => {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * mult, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo * mult, t + dur);
    g.gain.value = level;
    osc.connect(g).connect(gain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

const SOUNDS: Record<ScanSound, (audio: AudioContext) => void> = {
  success: (audio) => {
    note(audio, 784, 0, 0.14); // G5
    note(audio, 1047, 0.1, 0.26); // C6
  },
  already: (audio) => {
    note(audio, 659, 0, 0.14); // E5
    note(audio, 659, 0.17, 0.16); // E5
  },
  fail: (audio) => {
    note(audio, 440, 0, 0.18); // A4
    note(audio, 311, 0.18, 0.36, { slideTo: 290 }); // E♭4, drooping
  },
};

// Matching vibration patterns (ms) for loud rooms. Android only; iOS ignores vibrate.
const VIBES: Record<ScanSound, number[]> = {
  success: [60],
  already: [80, 60, 80],
  fail: [350],
};

/** Play the feedback for a scan result. */
export function playScanSound(result: ScanSound) {
  if (!ctx) unlockAudio();
  if (ctx) SOUNDS[result](ctx);
  navigator.vibrate?.(VIBES[result]);
}
