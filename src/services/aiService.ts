import type { AIResult } from "../types";
import { analyzeScanFrame } from "../scan/scan-pipeline";
import { getMockScanPreset } from "../mock/scanPresets";

type AnalyzeInput =
  | { imageData: ImageData; previewDataUrl?: string }
  | { previewDataUrl: string };

export async function analyzeColor(input: AnalyzeInput): Promise<AIResult> {
  if ("imageData" in input) {
    const qrId = localStorage.getItem("lastQR") ?? "demo";
    return analyzeScanFrame({
      imageData: input.imageData,
      previewDataUrl: input.previewDataUrl,
      qrId,
      mode: "live",
      qrConfidence: 0.98,
    }).result;
  }

  return getMockScanPreset(localStorage.getItem("mockQrId") ?? "123").result;
}

export function statusToUiTone(status: AIResult["ph"]["status"]) {
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

export function confidenceHintFromColor(status: AIResult["ph"]["status"]) {
  if (status === "critical") return 0.95;
  if (status === "spoiled") return 0.85;
  if (status === "fresh") return 0.9;
  return 0.75;
}
