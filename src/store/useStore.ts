import { create } from "zustand";
import type { Product, AIResult, AppStatus, ScanRecord } from "../types";

type State = {
  product: Product | null;
  aiResult: AIResult | null;
  status: AppStatus;
  lastError: string | null;
  history: ScanRecord[];

  setProduct: (p: Product) => void;
  setAI: (a: AIResult) => void;
  setStatus: (s: AppStatus) => void;
  setError: (message: string | null) => void;
  pushHistory: (r: ScanRecord) => void;
  reset: () => void;
};

export const useStore = create<State>((set) => ({
  product: null,
  aiResult: null,
  status: "idle",
  lastError: null,
  history: [],

  setProduct: (p) => set({ product: p }),
  setAI: (a) => set({ aiResult: a }),
  setStatus: (s) => set({ status: s }),
  setError: (message) => set({ lastError: message }),
  pushHistory: (r) =>
    set((state) => ({ history: [r, ...state.history].slice(0, 30) })),
  reset: () => set({ product: null, aiResult: null, status: "idle", lastError: null }),
}));