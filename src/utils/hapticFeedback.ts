/**
 * Haptic feedback patterns for scan results
 * Uses Vibration API: navigator.vibrate()
 */

import type { AlertStatus } from "../scan/types";

export type HapticPattern = "success" | "warning" | "alert" | "critical" | "error";
type LegacyVibrationNavigator = Navigator & {
  webkitVibrate?: (pattern: VibratePattern) => boolean;
  mozVibrate?: (pattern: VibratePattern) => boolean;
};

function getVibrationFunctions() {
  const nav = navigator as LegacyVibrationNavigator;
  return {
    vibrate: nav.vibrate?.bind(nav),
    webkitVibrate: nav.webkitVibrate?.bind(nav),
    mozVibrate: nav.mozVibrate?.bind(nav),
  };
}

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
  const vibration = getVibrationFunctions();
  return Boolean(vibration.vibrate || vibration.webkitVibrate || vibration.mozVibrate);
}

/**
 * Trigger haptic feedback based on status
 */
export function triggerHapticFeedback(status: AlertStatus, enabled: boolean = true): void {
  if (!enabled || !isVibrationSupported()) return;

  const pattern = statusToHapticPattern(status);
  const vibrationPattern = getVibrationPattern(pattern);
  const vibration = getVibrationFunctions();

  try {
    vibration.vibrate?.(vibrationPattern);
    vibration.webkitVibrate?.(vibrationPattern);
    vibration.mozVibrate?.(vibrationPattern);
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

  const vibration = getVibrationFunctions();

  try {
    vibration.vibrate?.(0);
    vibration.webkitVibrate?.(0);
    vibration.mozVibrate?.(0);
  } catch (error) {
    console.debug("Stop haptic failed:", error);
  }
}
