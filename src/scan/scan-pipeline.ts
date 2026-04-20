import type { PatchAnalysis, PhEstimate, ScanIssue, ScanResult } from "./types";
import { detectPatch } from "./patch-detector";
import { estimatePhFromPatch } from "./ph-estimator";

export type ScanFrameInput = {
  imageData: ImageData;
  previewDataUrl?: string;
  qrId: string;
  mode: "live" | "mock";
  qrConfidence?: number;
};

export type ScanOutcome = {
  patch: PatchAnalysis;
  ph: PhEstimate;
  warnings: ScanIssue[];
  result: ScanResult;
};

export function analyzeScanFrame(input: ScanFrameInput): ScanOutcome {
  const patch = detectPatch(input.imageData);
  const ph = estimatePhFromPatch(patch);
  const warnings = Array.from(new Set([...patch.warnings]));

  const result: ScanResult = {
    qr: {
      rawText: input.qrId,
      qrId: input.qrId,
      confidence: input.qrConfidence ?? 0.98,
      decoder: input.mode === "mock" ? "mock" : "html5-qrcode",
      attempts: 1,
    },
    patch,
    ph,
    warnings,
    previewDataUrl: input.previewDataUrl,
    scannedAt: new Date().toISOString(),
    mode: input.mode,
  };

  return { patch, ph, warnings, result };
}
