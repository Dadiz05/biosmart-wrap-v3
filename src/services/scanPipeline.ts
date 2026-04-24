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
  qrRecognitionIssue?: "qr-unreadable" | "qr-invalid";
};

export type ScanOutcome = {
  ph: PhEstimate;
  warnings: ScanIssue[];
  result: ScanResult;
};

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

  const ph = estimatePhFromPatch(patch);
  const extraWarnings: ScanIssue[] = [];

  if (!ai.model.ready) {
    extraWarnings.push("ai-unavailable");
  }

  if (input.qrRecognitionIssue) {
    extraWarnings.push(input.qrRecognitionIssue);
  }

  if (ai.mode === "visual-inspection") {
    extraWarnings.push("qr-structure-broken", "ai-visual-inspection");
  }

  const warnings = toWarnings(patch.warnings, extraWarnings);
  const effectiveQrId = input.qrDecoded && input.qrId ? input.qrId : "";

  const result: ScanResult = {
    qr: {
      rawText: input.qrDecoded && input.qrId ? input.qrId : "",
      qrId: effectiveQrId,
      confidence: input.qrDecoded ? input.qrConfidence ?? 0.98 : 0,
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
