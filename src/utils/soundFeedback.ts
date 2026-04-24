/**
 * Sound feedback for scan results
 * Uses Web Audio API to generate tones (no external files needed)
 */

import type { AlertStatus } from "../scan/types";

type SoundType = "success" | "warning" | "alert" | "critical" | "error";

interface AudioContext {
  ctx?: globalThis.AudioContext;
}

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const audioState: AudioContext = {};

/**
 * Get audio context (lazy initialized)
 */
function getAudioContext(): globalThis.AudioContext | null {
  if (!audioState.ctx) {
    try {
      const AudioCtx = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
      if (AudioCtx) {
        audioState.ctx = new AudioCtx();
      }
    } catch (error) {
      console.debug("AudioContext not available:", error);
      return null;
    }
  }
  return audioState.ctx ?? null;
}

/**
 * Map alert status to sound type
 */
function statusToSoundType(status: AlertStatus): SoundType {
  switch (status) {
    case "fresh":
      return "success";
    case "degraded":
      return "warning";
    case "spoiled":
      return "alert";
    case "critical":
      return "critical";
  }
}

/**
 * Generate tone using Web Audio API
 * freq: frequency in Hz
 * duration: duration in ms
 * volume: 0-1
 */
function playTone(freq: number, duration: number, volume: number = 0.3): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = freq;
    osc.type = "sine";

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.debug("Tone generation failed:", error);
  }
}

/**
 * Play a sequence of tones
 * tones: array of [frequency, duration]
 * gap: pause between tones (ms)
 */
function playToneSequence(tones: Array<[number, number]>, gap: number = 80): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  let currentTime = ctx.currentTime;
  for (const [freq, duration] of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = freq;
    osc.type = "sine";

    const durationSec = duration / 1000;
    gain.gain.setValueAtTime(0.25, currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, currentTime + durationSec);

    osc.start(currentTime);
    osc.stop(currentTime + durationSec);

    currentTime += durationSec + gap / 1000;
  }
}

/**
 * Play sound based on type
 */
function playSoundByType(soundType: SoundType): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  switch (soundType) {
    case "success":
      // Two ascending tones (cheerful)
      playToneSequence([[523, 150], [659, 150]], 80);
      break;

    case "warning":
      // Two mid-range tones (caution)
      playToneSequence([[440, 120], [440, 120]], 60);
      break;

    case "alert":
      // Three beeps (alert)
      playToneSequence([[880, 100], [880, 100], [880, 100]], 50);
      break;

    case "critical":
      // Descending alarm (danger)
      playToneSequence([[880, 150], [740, 150], [587, 150]], 50);
      break;

    case "error":
      // Long low tone (error)
      playTone(330, 300, 0.3);
      break;
  }
}

/**
 * Trigger sound feedback based on status
 */
export function triggerSoundFeedback(status: AlertStatus, enabled: boolean = true): void {
  if (!enabled) return;

  // Resume audio context if suspended (required after user interaction on some browsers)
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch((error) => {
      console.debug("AudioContext resume failed:", error);
    });
  }

  const soundType = statusToSoundType(status);
  playSoundByType(soundType);
}

/**
 * Preload audio context (should be called on user interaction)
 */
export function preloadAudioContext(): void {
  getAudioContext();
}
