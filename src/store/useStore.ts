import { create } from "zustand";
import type { AIResult, AppStatus, ScanPhase, Product, ScanRecord } from "../types";

type State = {
  product: Product | null;
  aiResult: AIResult | null;
  lastQrId: string | null;
  status: AppStatus;
  scanPhase: ScanPhase;
  lastError: string | null;
  scanCounter: number;
  history: ScanRecord[];

  setProduct: (p: Product) => void;
  setAI: (a: AIResult | null) => void;
  setLastQrId: (id: string | null) => void;
  setStatus: (s: AppStatus) => void;
  setScanPhase: (phase: ScanPhase) => void;
  setError: (message: string | null) => void;
  pushHistory: (r: Omit<ScanRecord, "scanNo">) => void;
  clearHistory: () => void;
  reset: () => void;
};

export const useStore = create<State>((set) => ({
  product: null,
  aiResult: null,
  lastQrId: null,
  status: "idle",
  scanPhase: "idle",
  lastError: null,
  scanCounter: 0,
  history: [],

  setProduct: (p) => set({ product: p }),
  setAI: (a) => set({ aiResult: a }),
  setLastQrId: (id) => set({ lastQrId: id }),
  setStatus: (s) => set({ status: s }),
  setScanPhase: (phase) => set({ scanPhase: phase }),
  setError: (message) => set({ lastError: message }),
  pushHistory: (r) =>
    set((state) => {
      const nextScanNo = state.scanCounter + 1;
      return {
        scanCounter: nextScanNo,
        history: [{ ...r, scanNo: nextScanNo }, ...state.history].slice(0, 30),
      };
    }),
  clearHistory: () => set({ history: [], scanCounter: 0 }),
  reset: () =>
    set({
      product: null,
      aiResult: null,
      lastQrId: null,
      status: "idle",
      scanPhase: "idle",
      lastError: null,
    }),
}));