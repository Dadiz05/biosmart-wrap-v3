import type { PatchAnalysis, ScanIssue } from "./types";

export type PatchFallbackDecision = {
  shouldReject: boolean;
  severity: "low" | "medium" | "high";
  reasonCodes: ScanIssue[];
  userMessage: string;
};

function uniqIssues(issues: ScanIssue[]) {
  return Array.from(new Set(issues));
}

export function evaluatePatchFallback(patch: PatchAnalysis): PatchFallbackDecision {
  const reasonCodes = uniqIssues([...patch.warnings]);

  const lowConfidence = patch.confidence < 0.5;
  const veryLowConfidence = patch.confidence < 0.35;
  const hasSevereWarning = reasonCodes.includes("patch-low-light") || reasonCodes.includes("patch-glare");

  if (veryLowConfidence || (lowConfidence && hasSevereWarning)) {
    return {
      shouldReject: true,
      severity: "high",
      reasonCodes: reasonCodes.length > 0 ? reasonCodes : ["analysis-failed"],
      userMessage:
        "Đã đọc được QR nhưng vùng patch pH chưa đủ rõ (thiếu sáng/lóa/góc lệch). Hãy chỉnh ánh sáng, giữ máy ổn định và quét lại.",
    };
  }

  if (lowConfidence || reasonCodes.length >= 2) {
    return {
      shouldReject: false,
      severity: "medium",
      reasonCodes,
      userMessage:
        "Patch pH đã đọc được nhưng độ tin cậy còn thấp. Bạn nên quét lại trong điều kiện ánh sáng tốt hơn để tăng độ chính xác.",
    };
  }

  return {
    shouldReject: false,
    severity: "low",
    reasonCodes,
    userMessage: "",
  };
}
