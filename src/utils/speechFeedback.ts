import type { AIResult } from "../types";

function buildSpeechText(result: AIResult) {
  const status = result.ph.label;
  const ph = result.ph.ph.toFixed(2);
  const confidence = Math.round(result.ph.confidence * 100);
  return `Kết quả quét. Trạng thái ${status}. Độ pH ${ph}. Độ tin cậy ${confidence} phần trăm.`;
}

export function speakScanResult(result: AIResult, enabled: boolean = false) {
  if (!enabled) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(buildSpeechText(result));
    utterance.lang = "vi-VN";
    utterance.rate = 0.98;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on unsupported devices.
  }
}

export function stopSpeechFeedback() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
