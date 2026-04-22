import type { AlertStatus, PatchAnalysis, PhEstimate } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolateHueToPh(hue: number) {
  const anchors = [
    { hue: 285, ph: 5.0 },
    { hue: 265, ph: 5.6 },
    { hue: 235, ph: 6.2 },
    { hue: 205, ph: 6.8 },
    { hue: 165, ph: 7.4 },
    { hue: 128, ph: 8.0 },
    { hue: 92, ph: 8.6 },
    { hue: 64, ph: 9.2 },
    { hue: 48, ph: 9.8 },
  ];

  const clampedHue = Math.max(48, Math.min(285, hue));
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const current = anchors[i];
    const next = anchors[i + 1];
    if (clampedHue <= current.hue && clampedHue >= next.hue) {
      const t = (current.hue - clampedHue) / Math.max(current.hue - next.hue, 1);
      return lerp(current.ph, next.ph, t);
    }
  }

  return clampedHue >= anchors[0].hue ? anchors[0].ph : anchors[anchors.length - 1].ph;
}

/**
 * Estimate pH confidence correction based on HSV saturation.
 * Tươi = cao saturation, phai = thấp saturation
 * Range: -0.15 to +0.15 pH adjustment
 */
function saturationPhAdjustment(saturation: number): number {
  // Fresh: sat > 0.65 → +0.15
  // Degraded: sat 0.45-0.65 → 0 to +0.05
  // Spoiled: sat 0.25-0.45 → -0.05 to 0
  // Critical: sat < 0.25 → -0.15
  if (saturation > 0.65) {
    return Math.min(0.15, (saturation - 0.65) * 0.3);
  }
  if (saturation > 0.45) {
    return (saturation - 0.45) * 0.25 - 0.05;
  }
  if (saturation > 0.25) {
    return (saturation - 0.25) * 0.1 - 0.15;
  }
  return -0.15;
}

/**
 * Estimate pH confidence correction based on HSV value (brightness).
 * Oxy cao = cao brightness, peroxide decomposition = brightness drop
 * Range: -0.1 to +0.1 pH adjustment
 */
function valueBrightnessPhAdjustment(brightness: number): number {
  // Optimal: 0.5-0.8 → no change
  // Low (<0.3): darker = older → -0.1
  // High (>0.85): overexposed = artifacts → -0.05
  if (brightness > 0.85) {
    return -0.05;
  }
  if (brightness > 0.5) {
    return 0;
  }
  if (brightness > 0.3) {
    return (brightness - 0.3) * -0.25;
  }
  return -0.1;
}

function statusFromPh(ph: number): AlertStatus {
  if (ph < 6.3) return "fresh";
  if (ph < 7.25) return "degraded";
  if (ph < 8.4) return "spoiled";
  return "critical";
}

function statusLabel(status: AlertStatus) {
  switch (status) {
    case "fresh":
      return "Tươi";
    case "degraded":
      return "Giảm chất lượng";
    case "spoiled":
      return "Ôi thiu";
    case "critical":
      return "Hỏng nặng";
  }
}

function statusMessage(status: AlertStatus) {
  switch (status) {
    case "fresh":
      return "Màu patch nằm trong vùng an toàn.";
    case "degraded":
      return "Mẫu bắt đầu lệch vùng an toàn, nên theo dõi thêm.";
    case "spoiled":
      return "Mẫu đã chuyển sang vùng cảnh báo rõ rệt.";
    case "critical":
      return "Mẫu vượt ngưỡng an toàn, nên loại bỏ.";
  }
}

export function estimatePhFromPatch(patch: PatchAnalysis, _qrId?: string): PhEstimate {
  const hue = patch.hsv.h;
  const saturation = patch.hsv.s;
  const brightness = patch.hsv.v;

  // Base pH from hue
  let ph = interpolateHueToPh(hue);

  // Apply HSV-based pH adjustments (multi-channel analysis)
  const saturationAdjust = saturationPhAdjustment(saturation);
  const brightnessAdjust = valueBrightnessPhAdjustment(brightness);
  ph = clamp01(ph + saturationAdjust + brightnessAdjust * 0.5) * 14;

  // Clamp pH to valid range 5-9.8
  ph = Math.max(5, Math.min(9.8, ph));

  const phLevel = Math.round(clamp01(ph / 14) * 200);
  const status = statusFromPh(ph);

  // Improved confidence calculation with HSV contributions
  // Weight: patch.confidence 60% (base accuracy), HSV channels 40%
  const saturationBoost = clamp01((saturation - 0.1) / 0.55);
  const brightnessBoost = clamp01(Math.abs(brightness - 0.65) < 0.2 ? 1 : 0.7);
  const hsvConfidence = saturationBoost * 0.2 + brightnessBoost * 0.15 + 0.05;

  const confidence = clamp01(
    patch.confidence * 0.6 +
      hsvConfidence +
      patch.calibration.quality * 0.1 -
      patch.warnings.length * 0.08
  );

  return {
    ph: Number(ph.toFixed(2)),
    phLevel,
    confidence: Number(confidence.toFixed(2)),
    status,
    label: statusLabel(status),
    message: statusMessage(status),
  };
}
