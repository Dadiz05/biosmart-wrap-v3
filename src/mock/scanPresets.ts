import type { ScanResult } from "../scan/types";

export type MockPreset = {
  qrId: string;
  label: string;
  result: ScanResult;
};

type MockResultInput = Omit<ScanResult, "ai"> & Partial<Pick<ScanResult, "ai">>;

function createMockResult(qrId: string, result: MockResultInput): ScanResult {
  return {
    ...result,
    ai: result.ai ?? {
      mode: "decoder-first",
      qrStructureScore: 0.9,
      objectDetectionConfidence: 0.88,
      segmentationConfidence: 0.86,
      segmentationLabel: "blue-spoilage",
      rectificationScore: 0.84,
      model: {
        ready: false,
        fallbackOnly: true,
        provider: "heuristic",
        backend: "none",
        loadMs: 0,
      },
      notes: ["Mock preset"],
    },
    qr: {
      ...result.qr,
      qrId,
      rawText: qrId,
    },
  };
}

const basePatch = {
  region: { x: 0.2, y: 0.58, width: 0.6, height: 0.28 },
  sampleCount: 3840,
  averageRgb: { r: 120, g: 90, b: 180 },
  calibratedRgb: { r: 126, g: 92, b: 188 },
  hsv: { h: 274, s: 0.51, v: 0.74 },
  luminance: 0.46,
  glareScore: 0.04,
  lowLightScore: 0.08,
  clarityScore: 0.82,
  confidence: 0.91,
  warnings: [],
  calibration: {
    method: "gray-world" as const,
    whiteBalance: { r: 1.02, g: 0.98, b: 1.08 },
    exposureScale: 1.04,
    gamma: 0.98,
    quality: 0.88,
    usedReference: false,
  },
};

export const mockScanPresets: MockPreset[] = [
  {
    qrId: "123",
    label: "Tươi",
    result: createMockResult("123", {
      qr: { rawText: "123", qrId: "123", confidence: 0.99, decoder: "mock", attempts: 1 },
      patch: {
        ...basePatch,
        averageRgb: { r: 138, g: 78, b: 186 },
        calibratedRgb: { r: 140, g: 76, b: 190 },
        hsv: { h: 282, s: 0.60, v: 0.75 },
        confidence: 0.95,
      },
      ph: {
        ph: 5.58,
        phLevel: 80,
        confidence: 0.96,
        status: "fresh",
        label: "Tươi",
        message: "Màu patch nằm trong vùng an toàn.",
      },
      warnings: [],
      mode: "mock",
      scannedAt: new Date().toISOString(),
    }),
  },
  {
    qrId: "456",
    label: "Giảm chất lượng",
    result: createMockResult("456", {
      qr: { rawText: "456", qrId: "456", confidence: 0.99, decoder: "mock", attempts: 1 },
      patch: {
        ...basePatch,
        averageRgb: { r: 96, g: 128, b: 198 },
        calibratedRgb: { r: 100, g: 132, b: 201 },
        hsv: { h: 214, s: 0.50, v: 0.79 },
        confidence: 0.89,
        warnings: ["patch-unclear"],
      },
      ph: {
        ph: 6.78,
        phLevel: 97,
        confidence: 0.9,
        status: "degraded",
        label: "Giảm chất lượng",
        message: "Mẫu bắt đầu lệch vùng an toàn, nên theo dõi thêm.",
      },
      warnings: ["patch-unclear"],
      mode: "mock",
      scannedAt: new Date().toISOString(),
    }),
  },
  {
    qrId: "789",
    label: "Ôi thiu",
    result: createMockResult("789", {
      qr: { rawText: "789", qrId: "789", confidence: 0.99, decoder: "mock", attempts: 1 },
      patch: {
        ...basePatch,
        averageRgb: { r: 76, g: 154, b: 92 },
        calibratedRgb: { r: 72, g: 160, b: 90 },
        hsv: { h: 133, s: 0.56, v: 0.63 },
        confidence: 0.86,
        warnings: ["patch-glare"],
      },
      ph: {
        ph: 8.08,
        phLevel: 115,
        confidence: 0.87,
        status: "spoiled",
        label: "Ôi thiu",
        message: "Mẫu đã chuyển sang vùng cảnh báo rõ rệt.",
      },
      warnings: ["patch-glare"],
      mode: "mock",
      scannedAt: new Date().toISOString(),
    }),
  },
  {
    qrId: "999",
    label: "Hỏng nặng",
    result: createMockResult("999", {
      qr: { rawText: "999", qrId: "999", confidence: 0.99, decoder: "mock", attempts: 1 },
      patch: {
        ...basePatch,
        averageRgb: { r: 230, g: 194, b: 72 },
        calibratedRgb: { r: 235, g: 198, b: 70 },
        hsv: { h: 47, s: 0.70, v: 0.92 },
        confidence: 0.92,
        warnings: ["patch-low-light"],
      },
      ph: {
        ph: 9.18,
        phLevel: 131,
        confidence: 0.93,
        status: "critical",
        label: "Hỏng nặng",
        message: "Mẫu vượt ngưỡng an toàn, nên loại bỏ.",
      },
      warnings: ["patch-low-light"],
      mode: "mock",
      scannedAt: new Date().toISOString(),
    }),
  },
];

export function getMockScanPreset(qrId: string) {
  const preset = mockScanPresets.find((item) => item.qrId === qrId) ?? mockScanPresets[0];
  return {
    ...preset,
    result: {
      ...preset.result,
      scannedAt: new Date().toISOString(),
    },
  };
}
