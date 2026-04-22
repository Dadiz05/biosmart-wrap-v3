import { detectPatch } from "../scan/patch-detector";
import { estimatePhFromPatch } from "../scan/ph-estimator";
import { analyzeAIVision } from "../scan/ai-vision";
import type { PhEstimate, ScanIssue, ScanResult } from "../scan/types";

export type ScanFrameInput = {
  imageData: ImageData;
  previewDataUrl?: string;
  qrId?: string;
  mode: "live" | "mock";
  qrConfidence?: number;
  qrDecoded: boolean;
  decodeAttempts?: number;
};

export type ScanOutcome = {
  ph: PhEstimate;
  warnings: ScanIssue[];
  result: ScanResult;
};

function visualInspectionPh(basePh: PhEstimate, visualStatus: "spoiled" | "critical", confidence: number): PhEstimate {
  if (visualStatus === "critical") {
    return {
      ...basePh,
      ph: Math.max(8.7, basePh.ph),
      confidence: Number(Math.max(basePh.confidence, confidence).toFixed(2)),
      status: "critical",
      label: "Nguy hiểm",
      message: "QR khong con cau truc du de decode. AI visual inspection xac dinh nguy co hu hong cao.",
    };
  }

  return {
    ...basePh,
    ph: Math.max(7.7, basePh.ph),
    confidence: Number(Math.max(basePh.confidence, confidence).toFixed(2)),
    status: "spoiled",
    label: "Cảnh báo",
    message: "QR bi bien dang/manh vo. AI visual inspection danh gia mau va cau truc dang canh bao.",
  };
}

function toWarnings(baseWarnings: ScanIssue[], extraWarnings: ScanIssue[]) {
  return Array.from(new Set([...baseWarnings, ...extraWarnings]));
}

export async function analyzeScanFrameWithAI(input: ScanFrameInput): Promise<ScanOutcome> {
  const patch = detectPatch(input.imageData);
  const ai = await analyzeAIVision({
    imageData: input.imageData,
    patch,
    qrDecoded: input.qrDecoded,
  });

  let ph = estimatePhFromPatch(patch, input.qrId);
  const extraWarnings: ScanIssue[] = [];

  if (!ai.model.ready) {
    extraWarnings.push("ai-unavailable");
  }

  if (ai.mode === "visual-inspection") {
    extraWarnings.push("qr-structure-broken", "ai-visual-inspection");
    if (ai.visualStatus && typeof ai.visualConfidence === "number") {
      ph = visualInspectionPh(ph, ai.visualStatus, ai.visualConfidence);
    }
  }

  const warnings = toWarnings(patch.warnings, extraWarnings);
  const effectiveQrId = input.qrId ?? "VISUAL-INSPECTION";

  const result: ScanResult = {
    qr: {
      rawText: input.qrId ?? "VISUAL-INSPECTION",
      qrId: effectiveQrId,
      confidence: input.qrDecoded ? input.qrConfidence ?? 0.98 : ai.visualConfidence ?? 0.62,
      decoder: input.qrDecoded && ai.mode === "decoder-first" ? (input.mode === "mock" ? "mock" : "html5-qrcode") : "ai-visual-inspection",
      attempts: input.decodeAttempts ?? 1,
    },
    patch,
    ph,
    ai,
    warnings,
    previewDataUrl: input.previewDataUrl,
    scannedAt: new Date().toISOString(),
    mode: input.mode,
  };

  return {
    ph,
    warnings,
    result,
  };
}
