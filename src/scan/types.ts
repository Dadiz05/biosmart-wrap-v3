export type AlertStatus = "fresh" | "degraded" | "spoiled" | "critical";

export type ScanPhase = "idle" | "qr-decoding" | "patch-analysis" | "ai-analyzing" | "done" | "error";

export type ScanIssue =
  | "camera-unavailable"
  | "qr-invalid"
  | "qr-unreadable"
  | "patch-low-light"
  | "patch-glare"
  | "patch-unclear"
  | "qr-structure-broken"
  | "ai-unavailable"
  | "ai-visual-inspection"
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
  decoder: "html5-qrcode" | "mock" | "ai-visual-inspection";
  attempts: number;
};

export type SegmentationLabel = "purple-under-warm-light" | "blue-spoilage" | "green-advanced-spoilage";

export type AIModelStatus = {
  ready: boolean;
  fallbackOnly: boolean;
  provider: "tfjs-mobilenet" | "heuristic";
  backend: "webgl" | "cpu" | "none";
  loadMs: number;
};

export type AIRecognitionMeta = {
  mode: "decoder-first" | "visual-inspection";
  qrStructureScore: number;
  objectDetectionConfidence: number;
  segmentationConfidence: number;
  segmentationLabel: SegmentationLabel;
  rectificationScore: number;
  visualStatus?: "spoiled" | "critical";
  visualConfidence?: number;
  model: AIModelStatus;
  notes: string[];
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
  ai: AIRecognitionMeta;
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
