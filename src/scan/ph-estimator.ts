import type { AlertStatus, PatchAnalysis, PhEstimate } from "./types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type HsvCv = {
  h: number;
  s: number;
  v: number;
};

type HsvClassifier = {
  status: AlertStatus;
  label: string;
  message: string;
  phRange: [number, number];
  hsvCvMin: HsvCv;
  hsvCvMax: HsvCv;
};

type DebugWindow = Window & {
  __DEBUG_SCAN__?: boolean;
};

function isDebugScanEnabled() {
  if (typeof window === "undefined") return false;
  return Boolean((window as DebugWindow).__DEBUG_SCAN__);
}

const HSV_CLASSIFIERS: HsvClassifier[] = [
  {
    status: "fresh",
    label: "Tươi",
    message: "Mẫu ở màu tím, nằm trong vùng tươi an toàn.",
    phRange: [5.0, 6.0],
    // Tím
    hsvCvMin: { h: 118, s: 30, v: 40 },
    hsvCvMax: { h: 165, s: 255, v: 255 },
  },
  {
    status: "degraded",
    label: "Giảm chất lượng",
    message: "Mẫu ở màu xanh lam, chất lượng bắt đầu giảm.",
    phRange: [6.1, 7.0],
    // Xanh lam
    hsvCvMin: { h: 84, s: 30, v: 40 },
    hsvCvMax: { h: 123, s: 255, v: 255 },
  },
  {
    status: "spoiled",
    label: "Cảnh báo",
    message: "Mẫu ở màu xanh lá, đã vào vùng cảnh báo.",
    phRange: [7.1, 8.4],
    // Xanh lá
    hsvCvMin: { h: 40, s: 30, v: 40 },
    hsvCvMax: { h: 90, s: 255, v: 255 },
  },
  {
    status: "critical",
    label: "Nguy hiểm",
    message: "Mẫu ở màu vàng, đã vượt ngưỡng an toàn.",
    phRange: [8.5, 9.5],
    // Vàng
    hsvCvMin: { h: 15, s: 30, v: 40 },
    hsvCvMax: { h: 50, s: 255, v: 255 },
  },
];

function toOpenCvHsv(patch: PatchAnalysis): HsvCv {
  return {
    h: patch.hsv.h / 2,
    s: patch.hsv.s * 255,
    v: patch.hsv.v * 255,
  };
}

function inClassifierRange(value: HsvCv, classifier: HsvClassifier) {
  return (
    value.h >= classifier.hsvCvMin.h &&
    value.h <= classifier.hsvCvMax.h &&
    value.s >= classifier.hsvCvMin.s &&
    value.s <= classifier.hsvCvMax.s &&
    value.v >= classifier.hsvCvMin.v &&
    value.v <= classifier.hsvCvMax.v
  );
}

function classifierCenterHue(classifier: HsvClassifier) {
  return (classifier.hsvCvMin.h + classifier.hsvCvMax.h) / 2;
}

function clampInRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function hueToPhInClassifier(hueCv: number, classifier: HsvClassifier) {
  const [phMin, phMax] = classifier.phRange;
  const hue = clampInRange(hueCv, classifier.hsvCvMin.h, classifier.hsvCvMax.h);
  const t = (hue - classifier.hsvCvMin.h) / Math.max(classifier.hsvCvMax.h - classifier.hsvCvMin.h, 1);
  return lerp(phMin, phMax, t);
}

function classifierFitness(value: HsvCv, classifier: HsvClassifier) {
  const hueDistance = Math.abs(value.h - classifierCenterHue(classifier)) / 140;
  const satPenalty = value.s >= classifier.hsvCvMin.s ? 0 : (classifier.hsvCvMin.s - value.s) / 255;
  const valPenalty = value.v >= classifier.hsvCvMin.v ? 0 : (classifier.hsvCvMin.v - value.v) / 255;
  return clamp01(1 - hueDistance * 0.75 - satPenalty * 0.15 - valPenalty * 0.1);
}

export function estimatePhFromPatch(patch: PatchAnalysis): PhEstimate {
  const hsvCv = toOpenCvHsv(patch);

  // Debug: Log raw HSV values for troubleshooting color detection
  if (isDebugScanEnabled()) {
    console.log(
      `[pH Debug] Raw HSV (standard): h=${patch.hsv.h.toFixed(1)}° s=${(patch.hsv.s * 100).toFixed(1)}% v=${(patch.hsv.v * 100).toFixed(1)}% → OpenCV: h=${hsvCv.h.toFixed(1)} s=${hsvCv.s.toFixed(1)} v=${hsvCv.v.toFixed(1)}`
    );
  }

  const inRangeClassifier = HSV_CLASSIFIERS.find((classifier) => inClassifierRange(hsvCv, classifier));
  const classifier =
    inRangeClassifier ??
    HSV_CLASSIFIERS.reduce((best, current) =>
      classifierFitness(hsvCv, current) > classifierFitness(hsvCv, best) ? current : best
    );

  const phRaw = hueToPhInClassifier(hsvCv.h, classifier);
  const ph = clampInRange(phRaw, classifier.phRange[0], classifier.phRange[1]);
  const phLevel = Math.round(clamp01(ph / 14) * 200);
  const fitScore = classifierFitness(hsvCv, classifier);

  // Debug: Log final classifier selection
  if (isDebugScanEnabled()) {
    console.log(
      `[pH Debug] → Selected: ${classifier.label} (${classifier.status}) | pH=${ph.toFixed(2)} | InRange=${!!inRangeClassifier} | Fitness=${fitScore.toFixed(3)}`
    );
  }

  const confidencePenalty = inRangeClassifier ? 0 : 0.1;
  const confidence = clamp01(
    patch.confidence * 0.62 +
      fitScore * 0.25 +
      patch.calibration.quality * 0.18 -
      patch.warnings.length * 0.08 -
      confidencePenalty
  );

  return {
    ph: Number(ph.toFixed(2)),
    phLevel,
    confidence: Number(confidence.toFixed(2)),
    status: classifier.status,
    label: classifier.label,
    message: classifier.message,
  };
}
