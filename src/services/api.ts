import axios from "axios";
import type { ScanIssue } from "../scan/types";

// Dev: Vite proxy `/api` → localhost:5000. Production (Vercel): same path, proxied by `api/proxy.ts` + BIOSMART_BACKEND_URL.
// Override with full URL if API is public and CORS is configured: VITE_API_BASE_URL
const baseURL = import.meta.env.VITE_API_BASE_URL ?? "/api";

const API = axios.create({
  baseURL,
  timeout: 12_000,
});

export const getProduct = async (qrId: string) => {
  const res = await API.get(`/product/${encodeURIComponent(qrId)}`);
  return res.data;
};

export type FailedScanSamplePayload = {
  qrId?: string | null;
  previewDataUrl?: string;
  warnings?: ScanIssue[];
  mode: "live" | "mock";
  scanPhase?: string;
  aiMeta?: {
    mode?: string;
    qrStructureScore?: number;
    segmentationLabel?: string;
    segmentationConfidence?: number;
    rectificationScore?: number;
    provider?: string;
    fallbackOnly?: boolean;
  };
};

export const submitFailedScanSample = async (payload: FailedScanSamplePayload) => {
  const res = await API.post("/scan-samples/failure", payload);
  return res.data;
};
