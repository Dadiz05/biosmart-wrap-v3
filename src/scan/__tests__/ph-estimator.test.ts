import { describe, expect, it } from "vitest";
import { estimatePhFromPatch } from "../ph-estimator";
import type { PatchAnalysis } from "../types";

function makePatch(overrides: Partial<PatchAnalysis> = {}): PatchAnalysis {
  return {
    region: { x: 0, y: 0, width: 100, height: 100 },
    sampleCount: 100,
    averageRgb: { r: 120, g: 80, b: 160 },
    calibratedRgb: { r: 120, g: 80, b: 160 },
    hsv: { h: 285, s: 0.8, v: 0.7 },
    luminance: 0.5,
    glareScore: 0.05,
    lowLightScore: 0.05,
    clarityScore: 0.8,
    confidence: 0.9,
    warnings: [],
    calibration: {
      method: "gray-world",
      whiteBalance: { r: 1, g: 1, b: 1 },
      exposureScale: 1,
      gamma: 1,
      quality: 0.9,
      usedReference: false,
    },
    ...overrides,
  };
}

describe("estimatePhFromPatch", () => {
  it("maps purple hue to a fresh result", () => {
    const result = estimatePhFromPatch(makePatch({ hsv: { h: 285, s: 0.82, v: 0.7 } }));

    expect(result.status).toBe("fresh");
    expect(result.ph).toBeGreaterThanOrEqual(5);
    expect(result.ph).toBeLessThan(6.5);
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it("keeps the output in the supported pH range", () => {
    const result = estimatePhFromPatch(makePatch({ hsv: { h: 48, s: 0.2, v: 0.2 } }));

    expect(result.ph).toBeGreaterThanOrEqual(5);
    expect(result.ph).toBeLessThanOrEqual(9.8);
    expect(["spoiled", "critical"]).toContain(result.status);
  });

  it("reduces confidence when warnings are present", () => {
    const clean = estimatePhFromPatch(makePatch({ warnings: [] }));
    const noisy = estimatePhFromPatch(makePatch({ warnings: ["patch-glare", "patch-unclear"] }));

    expect(noisy.confidence).toBeLessThan(clean.confidence);
  });
});