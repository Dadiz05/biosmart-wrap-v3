import * as tf from "@tensorflow/tfjs";
import type { AIResult } from "../types";

type DetectedColor = AIResult["color"];

type AnalyzeInput =
  | { imageData: ImageData; previewDataUrl?: string }
  | { previewDataUrl: string };

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function rgbToHsv(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rr:
        h = ((gg - bb) / d) % 6;
        break;
      case gg:
        h = (bb - rr) / d + 2;
        break;
      case bb:
        h = (rr - gg) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function detectColorHeuristic(imageData: ImageData): DetectedColor {
  // Downsample by skipping pixels for speed (works well for QR patch)
  const data = imageData.data;
  const stride = 16; // sample every 16th pixel (RGBA = 4 bytes)

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4 * stride) {
    const a = data[i + 3];
    if (a < 16) continue;
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    count++;
  }

  if (count === 0) return "blue";

  const r = rSum / count;
  const g = gSum / count;
  const b = bSum / count;
  const { h, s, v } = rgbToHsv(r, g, b);

  // Filter out very low saturation (white/gray) — treat as "blue" middle band
  if (s < 0.12 || v < 0.12) return "blue";

  // Hue buckets tuned for anthocyanin-like palette
  // yellow: 45..80, green: 80..160, blue: 160..255, purple: 255..340 (+ wrap)
  if (h >= 45 && h < 80) return "yellow";
  if (h >= 80 && h < 160) return "green";
  if (h >= 160 && h < 255) return "blue";
  return "purple";
}

function colorToPhAndStatus(color: DetectedColor): Pick<AIResult, "ph" | "status"> {
  // Map theo bảng nghiệp vụ:
  // - purple: pH 5–6 → tươi
  // - blue: pH 6.5–7.5 → giảm chất lượng
  // - green: pH 7.5–8.5 → ôi thiu
  // - yellow (xanh vàng): pH 8.5–9.5 → hỏng nặng
  switch (color) {
    case "purple":
      return { ph: 5.5, status: "fresh" };
    case "blue":
      return { ph: 7.0, status: "degraded" };
    case "green":
      return { ph: 8.0, status: "spoiled" };
    case "yellow":
      return { ph: 9.0, status: "critical" };
  }
}

let cachedModel: tf.GraphModel | null = null;

async function tryLoadModel() {
  if (cachedModel) return cachedModel;
  try {
    // Optional: place a TFJS graph model at public/model/model.json
    cachedModel = await tf.loadGraphModel("/model/model.json");
    return cachedModel;
  } catch {
    return null;
  }
}

async function detectColorWithModel(imageData: ImageData): Promise<DetectedColor | null> {
  const model = await tryLoadModel();
  if (!model) return null;

  // Expect shape [1, H, W, 3] with values 0..1. Use 128x128 resize.
  const input = tf.tidy(() => {
    const t3 = tf.browser.fromPixels(imageData) as tf.Tensor3D;
    const resized3 = tf.image.resizeBilinear(t3, [128, 128]) as tf.Tensor3D;
    const normalized3 = resized3.toFloat().div(255) as tf.Tensor3D;
    return normalized3.expandDims(0) as tf.Tensor4D;
  });

  try {
    const output = model.predict(input) as tf.Tensor;
    const probs = await output.data();
    let bestIdx = 0;
    let bestVal = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < probs.length; i++) {
      const v = probs[i];
      if (v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    }
    // Convention: [purple, blue, green, yellow]
    const classes: DetectedColor[] = ["purple", "blue", "green", "yellow"];
    return classes[bestIdx] ?? null;
  } catch {
    return null;
  } finally {
    input.dispose();
  }
}

export async function analyzeColor(input: AnalyzeInput): Promise<AIResult> {
  if ("imageData" in input) {
    // Demo override (giúp test nhanh theo QR id)
    const lastQR = localStorage.getItem("lastQR");
    if (lastQR === "123") {
      return { ph: 5.5, color: "purple", status: "fresh", previewDataUrl: input.previewDataUrl };
    }
    if (lastQR === "456") {
      return { ph: 7.0, color: "blue", status: "degraded", previewDataUrl: input.previewDataUrl };
    }
    if (lastQR === "789") {
      return { ph: 8.0, color: "green", status: "spoiled", previewDataUrl: input.previewDataUrl };
    }
    if (lastQR === "999") {
      return { ph: 9.0, color: "yellow", status: "critical", previewDataUrl: input.previewDataUrl };
    }

    const modelColor = await detectColorWithModel(input.imageData);
    const color = modelColor ?? detectColorHeuristic(input.imageData);
    const { ph, status } = colorToPhAndStatus(color);
    return { ph, color, status, previewDataUrl: input.previewDataUrl };
  }

  // If only previewDataUrl available, we cannot reliably infer color without pixels.
  // Return a neutral degraded status to keep output shape stable.
  return { ph: 7.0, color: "blue", status: "degraded", previewDataUrl: input.previewDataUrl };
}

export function statusToUiTone(status: AIResult["status"]) {
  // for Tailwind class mapping (used by UI)
  switch (status) {
    case "fresh":
      return { accent: "emerald", label: "Tươi" };
    case "degraded":
      return { accent: "amber", label: "Giảm chất lượng" };
    case "spoiled":
      return { accent: "lime", label: "Ôi thiu" };
    case "critical":
      return { accent: "rose", label: "Hỏng nặng" };
  }
}

export function confidenceHintFromColor(color: DetectedColor) {
  // simple hint used for UI copy
  if (color === "yellow") return clamp01(0.95);
  if (color === "green") return clamp01(0.85);
  if (color === "purple") return clamp01(0.9);
  return clamp01(0.7);
}