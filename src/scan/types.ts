export type AlertStatus = "fresh" | "degraded" | "spoiled" | "critical";

export type ScanPhase = "idle" | "qr-decoding" | "patch-analysis" | "done" | "error";

export type ScanIssue =
  | "camera-unavailable"
  | "qr-invalid"
  | "qr-unreadable"
  | "patch-low-light"
  | "patch-glare"
  | "patch-unclear"
  | "analysis-failed"
  | "timeout";

export type ColorTriple = {
  r: number;
  g: number;
  b: number;
};

export type HsvTriple = {
  h: number;
  s: number;
  v: number;
};

export type RegionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CalibrationMethod = "gray-world" | "reference-strip";

export type CalibrationSnapshot = {
  method: CalibrationMethod;
  whiteBalance: ColorTriple;
  exposureScale: number;
  gamma: number;
  quality: number;
  usedReference: boolean;
};

export type QrDecodeResult = {
  rawText: string;
  qrId: string;
  confidence: number;
  decoder: "html5-qrcode" | "mock";
  attempts: number;
};

export type PatchAnalysis = {
  region: RegionRect;
  sampleCount: number;
  averageRgb: ColorTriple;
  calibratedRgb: ColorTriple;
  hsv: HsvTriple;
  luminance: number;
  glareScore: number;
  lowLightScore: number;
  clarityScore: number;
  confidence: number;
  warnings: ScanIssue[];
  calibration: CalibrationSnapshot;
};

export type PhEstimate = {
  ph: number;
  phLevel: number;
  confidence: number;
  status: AlertStatus;
  label: string;
  message: string;
};

export type ScanResult = {
  qr: QrDecodeResult;
  patch: PatchAnalysis;
  ph: PhEstimate;
  warnings: ScanIssue[];
  previewDataUrl?: string;
  scannedAt: string;
  mode: "live" | "mock";
};

export type Product = {
  name: string;
  supplier: string;
  packDate: string;
};

export type AIResult = ScanResult;

export type AppStatus = "idle" | "loading" | "done" | "error";

export type ScanRecord = {
  id: string;
  scanNo: number;
  qrId: string | null;
  scannedAt: string; // ISO
  status: AlertStatus | "blocked";
  reason?: string;
  product?: Product | null;
  aiResult?: ScanResult | null;
};
