import { describe, expect, it } from "vitest";
import { evaluatePatchFallback } from "../fallback";
import type { PatchAnalysis } from "../types";

function makePatch(overrides: Partial<PatchAnalysis> = {}): PatchAnalysis {
  return {
    region: { x: 0, y: 0, width: 100, height: 100 },
    sampleCount: 100,
    averageRgb: { r: 120, g: 80, b: 160 },
    calibratedRgb: { r: 120, g: 80, b: 160 },
    hsv: { h: 210, s: 0.4, v: 0.5 },
    luminance: 0.5,
    glareScore: 0.05,
    lowLightScore: 0.05,
    clarityScore: 0.8,
    confidence: 0.8,
    warnings: [],
    calibration: {
      method: "gray-world",
      whiteBalance: { r: 1, g: 1, b: 1 },
      exposureScale: 1,
      gamma: 1,
      quality: 0.8,
      usedReference: false,
    },
    ...overrides,
  };
}

describe("evaluatePatchFallback", () => {
  it("rejects very low confidence with severe warnings", () => {
    const result = evaluatePatchFallback(makePatch({ confidence: 0.3, warnings: ["patch-low-light"] }));

    expect(result.shouldReject).toBe(true);
    expect(result.severity).toBe("high");
  });

  it("keeps medium severity for low confidence without severe warnings", () => {
    const result = evaluatePatchFallback(makePatch({ confidence: 0.45, warnings: [] }));

    expect(result.shouldReject).toBe(false);
    expect(result.severity).toBe("medium");
  });

  it("passes clean high-confidence patches", () => {
    const result = evaluatePatchFallback(makePatch({ confidence: 0.9, warnings: [] }));

    expect(result.shouldReject).toBe(false);
    expect(result.severity).toBe("low");
    expect(result.userMessage).toBe("");
  });
});