import type { CalibrationSnapshot, ColorTriple } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clamp255(value: number) {
  return Math.max(0, Math.min(255, value));
}

function normalizeRgb(value: ColorTriple): ColorTriple {
  return {
    r: clamp255(value.r),
    g: clamp255(value.g),
    b: clamp255(value.b),
  };
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function rgbToHsv(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rr) hue = ((gg - bb) / delta) % 6;
    else if (max === gg) hue = (bb - rr) / delta + 2;
    else hue = (rr - gg) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = max === 0 ? 0 : delta / max;
  const value = max;
  return { h: hue, s: saturation, v: value };
}

function getGrayWorldGains(sample: ColorTriple): ColorTriple {
  const avg = mean([sample.r, sample.g, sample.b]) || 1;
  return {
    r: avg / Math.max(sample.r, 1),
    g: avg / Math.max(sample.g, 1),
    b: avg / Math.max(sample.b, 1),
  };
}

function applyGains(sample: ColorTriple, gains: ColorTriple, exposureScale: number, gamma: number): ColorTriple {
  const applyChannel = (value: number, gain: number) => {
    const normalized = clamp01((value * gain * exposureScale) / 255);
    return clamp255(Math.pow(normalized, gamma) * 255);
  };

  return normalizeRgb({
    r: applyChannel(sample.r, gains.r),
    g: applyChannel(sample.g, gains.g),
    b: applyChannel(sample.b, gains.b),
  });
}

export function calibratePatchColor(
  sample: ColorTriple,
  opts?: {
    whiteReference?: ColorTriple;
    blackReference?: ColorTriple;
  }
): { calibrated: ColorTriple; snapshot: CalibrationSnapshot } {
  const safeSample = normalizeRgb(sample);

  if (opts?.whiteReference || opts?.blackReference) {
    const white = opts.whiteReference ? normalizeRgb(opts.whiteReference) : { r: 240, g: 240, b: 240 };
    const black = opts.blackReference ? normalizeRgb(opts.blackReference) : { r: 20, g: 20, b: 20 };
    const gains = {
      r: (white.r - black.r) / Math.max(safeSample.r - black.r, 1),
      g: (white.g - black.g) / Math.max(safeSample.g - black.g, 1),
      b: (white.b - black.b) / Math.max(safeSample.b - black.b, 1),
    };
    const calibrated = applyGains(safeSample, gains, 1, 0.96);
    return {
      calibrated,
      snapshot: {
        method: "reference-strip",
        whiteBalance: gains,
        exposureScale: 1,
        gamma: 0.96,
        quality: clamp01(0.96 - Math.abs(mean([white.r, white.g, white.b]) - mean([black.r, black.g, black.b])) / 255),
        usedReference: true,
      },
    };
  }

  const gains = getGrayWorldGains(safeSample);
  const calibrated = applyGains(safeSample, gains, 1.04, 0.98);

  return {
    calibrated,
    snapshot: {
      method: "gray-world",
      whiteBalance: gains,
      exposureScale: 1.04,
      gamma: 0.98,
      quality: clamp01(1 - Math.abs(mean([safeSample.r, safeSample.g, safeSample.b]) - 128) / 140),
      usedReference: false,
    },
  };
}
