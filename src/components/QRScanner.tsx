import { useCallback, useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import ResultCard from "./ResultCard";
import { IconAlertTriangle, IconCamera, IconCheckCircle, IconStop, IconX } from "./Icons";
import { useStore } from "../store/useStore";
import { useCamera } from "../hooks/useCamera";
import { analyzeScanFrame } from "../scan/scan-pipeline";
import { createQrScanner, isValidQrId, normalizeQrId } from "../scan/qr-decoder";
import { evaluatePatchFallback } from "../scan/fallback";
import type { ScanPhase } from "../scan/types";

type Props = {
  open: boolean;
  onClose: () => void;
  lightMode?: boolean;
};

function statusBackground(status: "fresh" | "degraded" | "spoiled" | "critical") {
  switch (status) {
    case "fresh":
      return { bg: "#1fce10", text: "#ffffff" };
    case "degraded":
      return { bg: "#f7f60e", text: "#111827" };
    case "spoiled":
      return { bg: "#faa008", text: "#111827" };
    case "critical":
      return { bg: "#b81414", text: "#ffffff" };
  }
}

function phaseLabel(phase: ScanPhase) {
  switch (phase) {
    case "idle":
      return "Sẵn sàng";
    case "qr-decoding":
      return "Đọc QR";
    case "patch-analysis":
      return "Phân tích màu QR";
    case "done":
      return "Hoàn tất";
    case "error":
      return "Lỗi";
  }
}

function phaseTone(phase: ScanPhase, lightMode: boolean) {
  if (phase === "done") {
    return lightMode ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30";
  }
  if (phase === "error") {
    return lightMode ? "bg-rose-100 text-rose-800 ring-rose-200" : "bg-rose-500/15 text-rose-100 ring-rose-400/30";
  }
  if (phase === "patch-analysis") {
    return lightMode ? "bg-amber-100 text-amber-800 ring-amber-200" : "bg-amber-500/15 text-amber-100 ring-amber-400/30";
  }
  if (phase === "qr-decoding") {
    return lightMode ? "bg-sky-100 text-sky-800 ring-sky-200" : "bg-sky-500/15 text-sky-100 ring-sky-400/30";
  }
  return lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/15";
}

export default function QRScanner({ open, onClose, lightMode = false }: Props) {
  const {
    aiResult,
    lastError,
    status,
    scanPhase,
    setAI,
    setLastQrId,
    setStatus,
    setScanPhase,
    setError,
    pushHistory,
    reset,
  } = useStore();

  const scannerRef = useRef<ReturnType<typeof createQrScanner> | null>(null);
  const isScanningRef = useRef(false);
  const handledDecodeRef = useRef(false);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupTokenRef = useRef(0);
  const [isScanning, setIsScanning] = useState(false);

  const { captureFrame } = useCamera("reader");

  const stopTimer = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
  }, []);

  const setScanning = useCallback((next: boolean) => {
    isScanningRef.current = next;
    setIsScanning(next);
  }, []);

  const clearReaderDom = useCallback(() => {
    const root = document.getElementById("reader");
    if (!root) return;
    root.innerHTML = "";
  }, []);

  const safeStopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // ignore
    }
    try {
      await scanner.clear();
    } catch {
      // ignore
    }
  }, []);

  const closeModal = useCallback(async () => {
    cleanupTokenRef.current += 1;
    stopTimer();
    await safeStopScanner();
    setScanning(false);
    handledDecodeRef.current = false;
    clearReaderDom();
  }, [clearReaderDom, safeStopScanner, setScanning, stopTimer]);

  const flashScreen = useCallback(() => {
    const flash = document.createElement("div");
    flash.className = "fixed inset-0 bg-white z-[10100] opacity-75 transition-opacity duration-300";
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => {
        flash.remove();
      }, 300);
    }, 100);
  }, []);

  const failScan = useCallback(
    async (message: string, reason: string) => {
      setScanPhase("error");
      setStatus("error");
      setError(message);
      setScanning(false);
      stopTimer();
      await safeStopScanner();
      pushHistory({
        id: crypto.randomUUID(),
        qrId: null,
        scannedAt: new Date().toISOString(),
        status: "blocked",
        reason,
        aiResult: null,
      });
    },
    [pushHistory, safeStopScanner, setError, setScanPhase, setStatus, setScanning, stopTimer]
  );

  const failPatchAfterQr = useCallback(
    async (message: string, reason: string, qrId: string, partialResult: NonNullable<typeof aiResult>) => {
      setAI(partialResult);
      setScanPhase("error");
      setStatus("error");
      setError(message);
      setScanning(false);
      stopTimer();
      await safeStopScanner();
      pushHistory({
        id: crypto.randomUUID(),
        qrId,
        scannedAt: partialResult.scannedAt,
        status: partialResult.ph.status,
        reason,
        aiResult: partialResult,
      });
    },
    [pushHistory, safeStopScanner, setAI, setError, setScanPhase, setStatus, setScanning, stopTimer]
  );

  const finishWithResult = useCallback(
    async (result: NonNullable<typeof aiResult>) => {
      setAI(result);
      setStatus("done");
      setScanPhase("done");
      setError(null);
      setScanning(false);
      stopTimer();
      navigator.vibrate?.(120);
      flashScreen();
      pushHistory({
        id: crypto.randomUUID(),
        qrId: result.qr.qrId,
        scannedAt: result.scannedAt,
        status: result.ph.status,
        aiResult: result,
      });
      await safeStopScanner();
    },
    [flashScreen, pushHistory, safeStopScanner, setAI, setError, setScanPhase, setStatus, setScanning, stopTimer]
  );

  const startLiveScan = useCallback(async () => {
    if (isScanningRef.current) return;

    await closeModal();
    clearReaderDom();

    const token = cleanupTokenRef.current;
    const scanner = createQrScanner("reader");
    scannerRef.current = scanner;
    setScanning(true);
    setAI(null);
    setStatus("loading");
    setScanPhase("qr-decoding");
    setError(null);
    handledDecodeRef.current = false;

    scanTimeoutRef.current = setTimeout(() => {
      if (cleanupTokenRef.current !== token) return;
      void failScan(
        "Không đọc được QR. Hãy đưa QR vào đúng khung, giữ máy ổn định và thử lại.",
        "QR decode timeout"
      );
    }, 12000);

    try {
      await scanner.start(
        async (decodedText) => {
          if (handledDecodeRef.current) return;
          handledDecodeRef.current = true;
          stopTimer();

          const qrId = normalizeQrId(decodedText);
          if (!isValidQrId(qrId)) {
            await failScan("QR đọc được nhưng mã ID không hợp lệ.", `Invalid QR payload: ${decodedText}`);
            return;
          }

          setLastQrId(qrId);
          localStorage.setItem("lastQR", qrId);
          setScanPhase("patch-analysis");

          const frame = captureFrame({ maxSize: 960, quality: 0.84 });
          if (!frame) {
            await failScan("Không lấy được khung hình từ camera để phân tích màu QR.", "Capture failed");
            return;
          }

          const outcome = analyzeScanFrame({
            imageData: frame.imageData,
            previewDataUrl: frame.previewDataUrl,
            qrId,
            mode: "live",
            qrConfidence: 0.98,
          });

          const fallback = evaluatePatchFallback(outcome.patch);
          if (fallback.shouldReject) {
            await failPatchAfterQr(
              fallback.userMessage,
              `QR-color rejected: ${fallback.reasonCodes.join(",") || "analysis-failed"} | confidence=${outcome.patch.confidence.toFixed(2)}`,
              qrId,
              outcome.result
            );
            return;
          }

          setAI(outcome.result);
          setScanPhase("done");
          setStatus("done");
          setError(fallback.userMessage || null);
          await finishWithResult(outcome.result);
        },
        async () => {
          // html5-qrcode streams decode errors continuously; keep silent to avoid noisy UI.
        },
        { fps: 10, qrbox: { width: 280, height: 280 } }
      );
    } catch {
      await failScan("Không mở được camera. Hãy cấp quyền camera và thử lại.", "Camera unavailable");
    }
  }, [captureFrame, clearReaderDom, closeModal, failPatchAfterQr, failScan, finishWithResult, setAI, setError, setLastQrId, setScanPhase, setScanning, setStatus, stopTimer]);

  const startScan = useCallback(async () => {
    await startLiveScan();
  }, [startLiveScan]);

  const stopScan = useCallback(async () => {
    await closeModal();
    setStatus("idle");
    setScanPhase("idle");
  }, [closeModal, setScanPhase, setStatus]);

  const handleCloseScanner = useCallback(() => {
    void stopScan().then(() => {
      reset();
      onClose();
    });
  }, [onClose, reset, stopScan]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      void startScan();
    });
    return () => {
      cancelAnimationFrame(frame);
      cleanupTokenRef.current += 1;
      stopTimer();
      void safeStopScanner();
    };
  }, [open, safeStopScanner, startScan, stopTimer]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[9999] overflow-hidden ${lightMode ? "bg-slate-100" : "bg-slate-950"}`}>
      <div id="reader" className={`absolute inset-0 z-0 h-full w-full ${aiResult ? "pointer-events-none" : ""}`} />
      <div className={`absolute inset-0 z-10 ${lightMode ? "bg-white/30" : "bg-black/40"}`} />

      <div className="absolute inset-x-0 top-0 z-30 px-4 pt-4">
        <div className={`mx-auto max-w-md rounded-3xl px-4 py-3 ring-1 backdrop-blur ${lightMode ? "bg-white/90 text-slate-900 ring-slate-200" : "bg-black/35 text-white ring-white/10"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <BrandMark />
              <div className={`mt-1 text-xs ${lightMode ? "text-slate-600" : "text-white/70"}`}>
                Quét QR sinh học trong 1 khung
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseScanner}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.98] ${lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 ring-white/15"}`}
            >
              <IconX className="h-4 w-4" />
              Đóng
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${phaseTone(scanPhase, lightMode)}`}>
              {phaseLabel(scanPhase)}
            </span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${lightMode ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-white/5 text-white/65 ring-white/10"}`}>
              Live camera
            </span>
            {aiResult?.qr.qrId ? (
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${lightMode ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30"}`}>
                QR {aiResult.qr.qrId}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 px-4 pt-[128px] pb-[148px] pointer-events-none">
        {!aiResult && isScanning ? (
          <div className={`rounded-full px-4 py-2 text-sm font-medium ring-1 backdrop-blur ${lightMode ? "bg-white/90 text-slate-700 ring-slate-200" : "bg-black/40 text-white ring-white/10"}`}>
            Giữ toàn bộ mã QR nằm gọn trong khung để đọc ID và màu cùng lúc.
          </div>
        ) : null}

        <div className="relative w-[min(78vw,320px)] aspect-square max-w-md shrink-0 rounded-[2rem] border-[3px] border-emerald-400/80 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]">
          <div className="absolute inset-5 rounded-[1.25rem] border border-emerald-200/80 bg-emerald-400/8" />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 px-4 pb-6">
        <div className={`mx-auto max-w-md rounded-[1.75rem] p-3 ring-1 backdrop-blur ${lightMode ? "bg-white/90 ring-slate-200" : "bg-black/35 ring-white/10"}`}>
          {lastError && status === "error" ? (
            <div className={`mb-3 rounded-2xl px-3 py-2 text-sm font-medium ring-1 ${lightMode ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-rose-500/15 text-rose-100 ring-rose-400/30"}`}>
              {lastError}
            </div>
          ) : null}

          {!aiResult ? (
            <div className="grid gap-2">
              {isScanning ? (
                <button
                  type="button"
                  onClick={stopScan}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-500/20 active:scale-[0.99]"
                >
                  <IconStop className="h-5 w-5" />
                  Dừng quét
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startScan}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
                >
                  <IconCamera className="h-5 w-5" />
                  Bắt đầu quét
                </button>
              )}

              <div className={`text-center text-[11px] ${lightMode ? "text-slate-500" : "text-white/70"}`}>
                QR phải đọc được trước, sau đó hệ thống phân tích màu ngay trên chính mã QR đó.
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className={`rounded-2xl px-3 py-2 text-center text-sm font-semibold ring-1 ${lightMode ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30"}`}>
                Kết quả đã sẵn sàng. Bạn có thể quét lại hoặc đóng màn hình.
              </div>
              <button
                type="button"
                onClick={() => {
                  setAI(null);
                  void startScan();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-black/15 active:scale-[0.99]"
              >
                <IconCamera className="h-5 w-5" />
                Quét lại
              </button>
            </div>
          )}
        </div>
      </div>

      {aiResult ? (
        <div
          className="absolute inset-0 z-[10050] flex items-center justify-center px-4 py-6"
          style={{
            backgroundColor: statusBackground(aiResult.ph.status).bg,
            color: statusBackground(aiResult.ph.status).text,
          }}
        >
          <div className="w-full max-w-md">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-3xl bg-white/18 px-4 py-3 shadow-lg ring-1 ring-white/30 backdrop-blur">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-current/80">
                  Kết quả quét
                </div>
                <div className="mt-1 text-lg font-semibold">QR ID {aiResult.qr.qrId}</div>
              </div>
              {aiResult.ph.status === "fresh" ? (
                <IconCheckCircle className="h-8 w-8" />
              ) : (
                <IconAlertTriangle className="h-8 w-8" />
              )}
            </div>

            <div className="mb-3 rounded-3xl bg-white/18 px-5 py-4 text-center shadow-lg ring-1 ring-white/30 backdrop-blur">
              <div className="text-sm font-medium uppercase tracking-wide text-current/80">Độ pH</div>
              <div className="mt-1 text-5xl font-black leading-none">{aiResult.ph.ph.toFixed(2)}</div>
              <div className="mt-2 text-sm font-semibold text-current/90">{aiResult.ph.label}</div>
            </div>

            <ResultCard />

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setAI(null);
                  void startScan();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/85 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/15 ring-1 ring-white/40 active:scale-[0.99]"
              >
                <IconCamera className="h-5 w-5" />
                Quét lại
              </button>
              <button
                type="button"
                onClick={handleCloseScanner}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/20 px-6 py-3 text-sm font-semibold text-current ring-1 ring-white/35 active:scale-[0.99]"
              >
                <IconX className="h-4 w-4" />
                Về trang chính
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
