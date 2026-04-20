import { averageColorFromImageData } from "./camera";
import { calibratePatchColor, rgbToHsv } from "./color-calibration";
import type { PatchAnalysis, RegionRect, ScanIssue } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function regionForFrame(imageData: ImageData): RegionRect {
  const side = Math.round(Math.min(imageData.width, imageData.height) * 0.58);
  const x = Math.round((imageData.width - side) / 2);
  const y = Math.round((imageData.height - side) / 2);
  return {
    x,
    y,
    width: side,
    height: side,
  };
}

function dominantInkColorFromImageData(imageData: ImageData) {
  const data = imageData.data;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 12) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 16) continue;

    const hsv = rgbToHsv(r, g, b);
    const isLikelyInk = hsv.s > 0.18 && hsv.v < 0.92;
    if (!isLikelyInk) continue;

    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;
  }

  if (count < 24) return averageColorFromImageData(imageData);

  return {
    r: rSum / count,
    g: gSum / count,
    b: bSum / count,
  };
}

function sliceRegion(imageData: ImageData, region: RegionRect) {
  const width = Math.max(1, region.width);
  const height = Math.max(1, region.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const source = document.createElement("canvas");
  source.width = imageData.width;
  source.height = imageData.height;
  const sourceCtx = source.getContext("2d", { willReadFrequently: true });
  if (!sourceCtx) return null;
  sourceCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function computeGlareScore(imageData: ImageData) {
  const data = imageData.data;
  let glareCount = 0;
  let darkCount = 0;
  let total = 0;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const v = Math.max(r, g, b) / 255;
    if (v > 0.94) glareCount += 1;
    if (v < 0.16) darkCount += 1;
    total += 1;
  }

  return {
    glareScore: total === 0 ? 0 : glareCount / total,
    lowLightScore: total === 0 ? 1 : darkCount / total,
  };
}

function computeClarityScore(imageData: ImageData) {
  const data = imageData.data;
  let saturationSum = 0;
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 24) {
    const hsv = rgbToHsv(data[i], data[i + 1], data[i + 2]);
    saturationSum += hsv.s;
    sampleCount += 1;
  }

  const averageSaturation = sampleCount === 0 ? 0 : saturationSum / sampleCount;
  return clamp01(averageSaturation * 1.25);
}

export function detectPatch(imageData: ImageData): PatchAnalysis {
  const region = regionForFrame(imageData);
  const patchData = sliceRegion(imageData, region) ?? imageData;
  const averageRgb = dominantInkColorFromImageData(patchData);
  const hsv = rgbToHsv(averageRgb.r, averageRgb.g, averageRgb.b);
  const { glareScore, lowLightScore } = computeGlareScore(patchData);
  const clarity = computeClarityScore(patchData);
  const { calibrated, snapshot } = calibratePatchColor(averageRgb);
  const calibratedHsv = rgbToHsv(calibrated.r, calibrated.g, calibrated.b);

  const warnings: ScanIssue[] = [];
  if (lowLightScore > 0.55 || calibratedHsv.v < 0.18) warnings.push("patch-low-light");
  if (glareScore > 0.22) warnings.push("patch-glare");
  if (clarity < 0.22) warnings.push("patch-unclear");

  const confidence = clamp01(
    0.42 +
      clarity * 0.36 +
      Math.max(0, 0.28 - glareScore * 0.9) +
      Math.max(0, 0.22 - lowLightScore * 0.35) +
      snapshot.quality * 0.12
  );

  return {
    region,
    sampleCount: patchData.data.length / 4,
    averageRgb,
    calibratedRgb: calibrated,
    hsv: calibratedHsv.h ? calibratedHsv : hsv,
    luminance: (calibrated.r * 0.299 + calibrated.g * 0.587 + calibrated.b * 0.114) / 255,
    glareScore,
    lowLightScore,
    clarityScore: clarity,
    confidence,
    warnings,
    calibration: snapshot,
  };
}
