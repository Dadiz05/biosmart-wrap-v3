export type Product = {
  name: string;
  supplier: string;
  packDate: string;
};

export type AIResult = {
  ph: number;
  color: "purple" | "blue" | "green" | "yellow";
  status: "fresh" | "degraded" | "spoiled" | "critical";
  previewDataUrl?: string;
};

export type AppStatus = "idle" | "loading" | "done" | "error";

export type ScanRecord = {
  id: string;
  scanNo: number;
  qrId: string | null;
  scannedAt: string; // ISO
  status: AIResult["status"] | "blocked";
  reason?: string;
  product?: Product | null;
  aiResult?: (AIResult & { previewDataUrl?: string }) | null;
};