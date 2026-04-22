/**
 * Haptic feedback patterns for scan results
 * Uses Vibration API: navigator.vibrate()
 */

import type { AlertStatus } from "../scan/types";

export type HapticPattern = "success" | "warning" | "alert" | "critical" | "error";

/**
 * Map alert status to haptic pattern
 */
function statusToHapticPattern(status: AlertStatus): HapticPattern {
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
 * Get vibration pattern (in milliseconds)
 * Format: [vibrate, pause, vibrate, pause, ...]
 */
function getVibrationPattern(pattern: HapticPattern): number | number[] {
  switch (pattern) {
    case "success":
      // 1x short vibration = OK
      return 200;

    case "warning":
      // 2x medium vibrations = caution
      return [150, 100, 150];

    case "alert":
      // 3x quick vibrations = warning
      return [120, 80, 120, 80, 120];

    case "critical":
      // Continuous vibration = danger
      return 500;

    case "error":
      // 2x long vibrations = error
      return [250, 150, 250];

    default:
      return 100;
  }
}

/**
 * Check if device supports vibration API
 */
function isVibrationSupported(): boolean {
  return "vibrate" in navigator || "webkitVibrate" in navigator || "mozVibrate" in navigator;
}

/**
 * Trigger haptic feedback based on status
 */
export function triggerHapticFeedback(status: AlertStatus, enabled: boolean = true): void {
  if (!enabled || !isVibrationSupported()) return;

  const pattern = statusToHapticPattern(status);
  const vibrationPattern = getVibrationPattern(pattern);

  try {
    if (navigator.vibrate) {
      navigator.vibrate(vibrationPattern);
    } else if ((navigator as any).webkitVibrate) {
      (navigator as any).webkitVibrate(vibrationPattern);
    } else if ((navigator as any).mozVibrate) {
      (navigator as any).mozVibrate(vibrationPattern);
    }
  } catch (error) {
    // Silently fail if vibration not available
    console.debug("Haptic feedback unavailable:", error);
  }
}

/**
 * Stop any ongoing vibration
 */
export function stopHapticFeedback(): void {
  if (!isVibrationSupported()) return;

  try {
    if (navigator.vibrate) {
      navigator.vibrate(0);
    } else if ((navigator as any).webkitVibrate) {
      (navigator as any).webkitVibrate(0);
    } else if ((navigator as any).mozVibrate) {
      (navigator as any).mozVibrate(0);
    }
  } catch (error) {
    console.debug("Stop haptic failed:", error);
  }
}
