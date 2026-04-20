import type { AlertStatus, PatchAnalysis, PhEstimate } from "./types";

const QR_BATCH_TOTAL = 160;
const QR_BATCH_MIN_PH = 5.0;
const QR_BATCH_MAX_PH = 9.5;

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

function parseGeneratedQrIndex(qrId?: string) {
  if (!qrId) return null;
  const match = /^QR-(\d{1,3})$/i.exec(qrId.trim());
  if (!match) return null;
  const index = Number(match[1]);
  if (!Number.isFinite(index) || index < 1 || index > QR_BATCH_TOTAL) return null;
  return index;
}

function phFromGeneratedQrIndex(index: number) {
  const t = QR_BATCH_TOTAL <= 1 ? 0 : (index - 1) / (QR_BATCH_TOTAL - 1);
  return QR_BATCH_MIN_PH + (QR_BATCH_MAX_PH - QR_BATCH_MIN_PH) * t;
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

export function estimatePhFromPatch(patch: PatchAnalysis, qrId?: string): PhEstimate {
  const hue = patch.hsv.h;
  const qrIndex = parseGeneratedQrIndex(qrId);
  const ph = qrIndex ? phFromGeneratedQrIndex(qrIndex) : interpolateHueToPh(hue);
  const phLevel = qrIndex ?? Math.round(clamp01(ph / 14) * QR_BATCH_TOTAL);
  const status = statusFromPh(ph);
  const saturationBoost = clamp01((patch.hsv.s - 0.1) / 0.55);
  const valueBoost = clamp01((patch.hsv.v - 0.12) / 0.68);
  const confidence = clamp01(
    patch.confidence * 0.62 +
      saturationBoost * 0.2 +
      valueBoost * 0.1 +
      patch.calibration.quality * 0.08 -
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
