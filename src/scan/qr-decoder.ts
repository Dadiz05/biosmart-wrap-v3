import { Html5Qrcode } from "html5-qrcode";

export type QrScannerController = {
  stop: () => Promise<void>;
  clear: () => Promise<void>;
};

export function normalizeQrId(value: string) {
  return value.trim();
}

export function isValidQrId(value: string) {
  const normalized = normalizeQrId(value);
  return /^[A-Za-z0-9_-]{2,64}$/.test(normalized);
}

export function createQrScanner(elementId: string) {
  const scanner = new Html5Qrcode(elementId);

  return {
    start: async (
      onDecoded: (rawText: string) => void,
      onFailure?: (error: unknown) => void,
      opts?: { fps?: number; qrbox?: { width: number; height: number } }
    ) => {
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: opts?.fps ?? 10,
          qrbox: opts?.qrbox ?? { width: 280, height: 280 },
          disableFlip: false,
        },
        (decodedText) => onDecoded(decodedText),
        (_, error) => {
          onFailure?.(error);
        }
      );
    },
    stop: async () => {
      try {
        await scanner.stop();
      } catch {
        // ignore
      }
    },
    clear: async () => {
      try {
        await scanner.clear();
      } catch {
        // ignore
      }
    },
  } satisfies QrScannerController & {
    start: (
      onDecoded: (rawText: string) => void,
      onFailure?: (error: unknown) => void,
      opts?: { fps?: number; qrbox?: { width: number; height: number } }
    ) => Promise<void>;
  };
}
