import { useCallback, useEffect, useRef, useState } from "react";
import BrandMark from "./BrandMark";
import BioSmartScanResult from "./BioSmartScanResult";
import { IconCamera, IconStop, IconX } from "./Icons";
import { useStore } from "../store/useStore";
import { useCamera } from "../hooks/useCamera";
import { analyzeScanFrameWithAI } from "../services/scanPipeline";
import { createQrScanner, isBioSmartQrId, isValidQrId, normalizeQrId } from "../scan/qr-decoder";
import { evaluatePatchFallback } from "../scan/fallback";
import { triggerHapticFeedback } from "../utils/hapticFeedback";
import { triggerSoundFeedback } from "../utils/soundFeedback";
import { speakScanResult, stopSpeechFeedback } from "../utils/speechFeedback";
import type { AlertStatus, ScanIssue, ScanPhase } from "../scan/types";
import { submitFailedScanSample } from "../services/api";

type Props = {
  open: boolean;
  onClose: () => void;
  lightMode?: boolean;
  onViewProduct?: (qrId: string) => void;
};

function statusBackground(status: "fresh" | "degraded" | "spoiled" | "critical") {
  switch (status) {
    case "fresh":    return { bg: "#22c55e", text: "#ffffff" };
    case "degraded": return { bg: "#eab308", text: "#0f172a" };
    case "spoiled":  return { bg: "#f97316", text: "#0f172a" };
    case "critical": return { bg: "#ef4444", text: "#ffffff" };
  }
}

function statusResultOverlay(status: "fresh" | "degraded" | "spoiled" | "critical") {
  if (status === "fresh") {
    return "linear-gradient(165deg, rgba(34,197,94,0.95) 0%, rgba(21,128,61,0.88) 50%, rgba(5,46,22,0.96) 100%)";
  }
  if (status === "degraded") {
    return "linear-gradient(165deg, rgba(234,179,8,0.95) 0%, rgba(161,98,7,0.88) 50%, rgba(66,32,6,0.96) 100%)";
  }
  if (status === "spoiled") {
    return "linear-gradient(160deg, rgba(249,115,22,0.95) 0%, rgba(194,65,12,0.88) 50%, rgba(67,20,7,0.96) 100%)";
  }
  return "linear-gradient(162deg, rgba(239,68,68,0.95) 0%, rgba(153,27,27,0.90) 52%, rgba(69,10,10,0.96) 100%)";
}

function phaseLabel(phase: ScanPhase) {
  switch (phase) {
    case "idle":
      return "Sẵn sàng quét";
    case "qr-decoding":
      return "Đang nhận diện mã";
    case "patch-analysis":
      return "Đang phân tích màu";
    case "ai-analyzing":
      return "AI đang phân tích";
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
  if (phase === "ai-analyzing") {
    return lightMode ? "bg-indigo-100 text-indigo-800 ring-indigo-200" : "bg-indigo-500/20 text-indigo-100 ring-indigo-400/40";
  }
  if (phase === "qr-decoding") {
    return lightMode ? "bg-sky-100 text-sky-800 ring-sky-200" : "bg-sky-500/15 text-sky-100 ring-sky-400/30";
  }
  return lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/15";
}

type BatchProgressState = {
  active: boolean;
  current: number;
  total: number;
  variance: number | null;
};

type ScanResult = NonNullable<ReturnType<typeof useStore.getState>["aiResult"]>;

const BATCH_MIN_FRAMES = 3;
const BATCH_MAX_FRAMES = 5;

const defaultBatchProgress: BatchProgressState = {
  active: false,
  current: 0,
  total: BATCH_MAX_FRAMES,
  variance: null,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function statusFromPh(ph: number): AlertStatus {
  if (ph <= 6.0) return "fresh";
  if (ph <= 7.0) return "degraded";
  if (ph <= 8.5) return "spoiled";
  return "critical";
}

function statusLabel(status: AlertStatus) {
  switch (status) {
    case "fresh":
      return "Tươi";
    case "degraded":
      return "Giảm chất lượng";
    case "spoiled":
      return "Cảnh báo";
    case "critical":
      return "Nguy hiểm";
  }
}

function statusMessage(status: AlertStatus) {
  switch (status) {
    case "fresh":
      return "Nằm trong vùng tươi an toàn.";
    case "degraded":
      return "Chất lượng sản phẩm đang giảm.";
    case "spoiled":
      return "Sản phẩm đã vào vùng cảnh báo.";
    case "critical":
      return "Sản phẩm đã vượt ngưỡng an toàn.";
  }
}

function uniqueWarnings(warnings: ScanIssue[]) {
  return Array.from(new Set(warnings));
}

function withQrIssueWarning(result: ScanResult, issue: "qr-unreadable" | "qr-invalid"): ScanResult {
  const issueMessage =
    issue === "qr-unreadable"
      ? "Không đọc được mã, kết quả vẫn được tính theo màu mẫu."
      : "Mã không hợp lệ, kết quả vẫn được tính theo màu mẫu.";

  return {
    ...result,
    ph: {
      ...result.ph,
      message: `${result.ph.message} ${issueMessage}`,
    },
    warnings: uniqueWarnings([...result.warnings, issue]),
  };
}

function averageResult(results: ScanResult[]): ScanResult {
  const phValues = results.map((result) => result.ph.ph);
  const confidenceValues = results.map((result) => result.ph.confidence);
  const patchConfidenceValues = results.map((result) => result.patch.confidence);
  const avgPh = mean(phValues);
  const avgConfidence = mean(confidenceValues);
  const avgPatchConfidence = mean(patchConfidenceValues);
  const phStatus = statusFromPh(avgPh);
  const base = results[results.length - 1];

  return {
    ...base,
    ph: {
      ...base.ph,
      ph: Number(avgPh.toFixed(2)),
      phLevel: Math.round(clamp01(avgPh / 14) * 200),
      confidence: Number(avgConfidence.toFixed(2)),
      status: phStatus,
      label: statusLabel(phStatus),
      message: statusMessage(phStatus),
    },
    patch: {
      ...base.patch,
      confidence: Number(avgPatchConfidence.toFixed(2)),
      warnings: uniqueWarnings(results.flatMap((result) => result.patch.warnings)),
    },
    warnings: uniqueWarnings(results.flatMap((result) => result.warnings)),
  };
}

export default function QRScanner({ open, onClose, lightMode = false, onViewProduct }: Props) {
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
  const [batchProgress, setBatchProgress] = useState<BatchProgressState>(defaultBatchProgress);

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
    setBatchProgress(defaultBatchProgress);
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
      setBatchProgress(defaultBatchProgress);
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
      setBatchProgress(defaultBatchProgress);
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
      void submitFailedScanSample({
        qrId,
        previewDataUrl: partialResult.previewDataUrl,
        warnings: partialResult.warnings,
        mode: partialResult.mode,
        scanPhase: "error",
        aiMeta: {
          mode: partialResult.ai.mode,
          qrStructureScore: partialResult.ai.qrStructureScore,
          segmentationLabel: partialResult.ai.segmentationLabel,
          segmentationConfidence: partialResult.ai.segmentationConfidence,
          rectificationScore: partialResult.ai.rectificationScore,
          provider: partialResult.ai.model.provider,
          fallbackOnly: partialResult.ai.model.fallbackOnly,
        },
      }).catch(() => {
        // ignore telemetry failures
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
      setBatchProgress(defaultBatchProgress);
      stopTimer();

      // Trigger haptic & sound feedback based on result status
      const { feedbackSettings } = useStore.getState();
      triggerHapticFeedback(result.ph.status, feedbackSettings.haptic);
      triggerSoundFeedback(result.ph.status, feedbackSettings.sound);
      speakScanResult(result, feedbackSettings.voice);

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

  const runBatchValidation = useCallback(
    async (input: {
      token: number;
      qrId?: string;
      qrDecoded: boolean;
      qrRecognitionIssue?: "qr-unreadable" | "qr-invalid";
      previewDataUrl?: string;
      mode: "live" | "mock";
      decodeAttempts: number;
      qrConfidence?: number;
    }) => {
      const collected: ScanResult[] = [];
      let latestPreview = input.previewDataUrl;
      const totalFrames = BATCH_MAX_FRAMES;

      setBatchProgress({ active: true, current: 0, total: totalFrames, variance: null });
      setScanPhase("patch-analysis");

      for (let index = 0; index < totalFrames; index += 1) {
        if (cleanupTokenRef.current !== input.token) {
          break;
        }

        const frame = captureFrame({ maxSize: 960, quality: input.qrDecoded ? 0.84 : 0.82 });
        if (!frame) {
          continue;
        }

        latestPreview = frame.previewDataUrl;
        setBatchProgress((state) => ({
          ...state,
          active: true,
          current: collected.length + 1,
          total: totalFrames,
        }));

        const outcome = await analyzeScanFrameWithAI({
          imageData: frame.imageData,
          previewDataUrl: frame.previewDataUrl,
          mode: input.mode,
          qrId: input.qrId,
          qrConfidence: input.qrConfidence,
          qrDecoded: input.qrDecoded,
          decodeAttempts: input.decodeAttempts,
          qrRecognitionIssue: input.qrRecognitionIssue,
        });

        collected.push(outcome.result);

        const currentVariance = variance(collected.map((result) => result.ph.ph));
        const currentConfidence = mean(collected.map((result) => result.ph.confidence));
        setBatchProgress({
          active: true,
          current: collected.length,
          total: totalFrames,
          variance: Number(currentVariance.toFixed(3)),
        });

        if (collected.length >= BATCH_MIN_FRAMES) {
          if (currentVariance <= 0.3 && currentConfidence >= 0.68) {
            break;
          }
          if (currentVariance > 0.8) {
            break;
          }
        }
      }

      if (collected.length < BATCH_MIN_FRAMES) {
        await failScan(
          "Chưa lấy đủ khung hình ổn định để chốt kết quả. Hãy giữ máy yên hơn và quét lại.",
          "Batch validation timeout"
        );
        return null;
      }

      const mergedResult = averageResult(collected);
      const phVariance = variance(collected.map((result) => result.ph.ph));
      const avgConfidence = mean(collected.map((result) => result.ph.confidence));

      if (phVariance > 0.5) {
        await failPatchAfterQr(
          "Các khung hình đang dao động quá nhiều. Hãy giữ máy ổn định và quét lại để có kết quả chắc hơn.",
          `Batch rejected: variance=${phVariance.toFixed(3)} confidence=${avgConfidence.toFixed(2)}`,
          input.qrId ?? mergedResult.qr.qrId,
          mergedResult
        );
        return null;
      }

      if (avgConfidence < 0.55) {
        await failPatchAfterQr(
          "Độ tin cậy chưa đủ tốt. Hãy quét lại trong điều kiện sáng hơn và giữ QR thẳng hơn.",
          `Batch rejected: low-confidence=${avgConfidence.toFixed(2)} variance=${phVariance.toFixed(3)}`,
          input.qrId ?? mergedResult.qr.qrId,
          mergedResult
        );
        return null;
      }

      if (latestPreview) {
        mergedResult.previewDataUrl = latestPreview;
      }

      return mergedResult;
    },
    [captureFrame, failPatchAfterQr, failScan, setBatchProgress, setScanPhase]
  );

  const runColorFirstFlow = useCallback(
    async (input: { token: number; issue: "qr-unreadable" | "qr-invalid"; attempts: number }) => {
      const batchResult = await runBatchValidation({
        token: input.token,
        qrDecoded: false,
        qrRecognitionIssue: input.issue,
        mode: "live",
        decodeAttempts: input.attempts,
      });

      if (!batchResult) {
        return;
      }

      await finishWithResult(withQrIssueWarning(batchResult, input.issue));
    },
    [finishWithResult, runBatchValidation]
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
      void (async () => {
        handledDecodeRef.current = true;
        stopTimer();
        await runColorFirstFlow({ token, issue: "qr-unreadable", attempts: 0 });
      })();
    }, 12000);

    try {
      await scanner.start(
        async (decodedText) => {
          if (handledDecodeRef.current) return;
          handledDecodeRef.current = true;
          stopTimer();

          const qrId = normalizeQrId(decodedText);
          if (!isValidQrId(qrId)) {
            await runColorFirstFlow({ token, issue: "qr-invalid", attempts: 1 });
            return;
          }

          if (!isBioSmartQrId(qrId)) {
            await runColorFirstFlow({ token, issue: "qr-invalid", attempts: 1 });
            return;
          }

          setLastQrId(qrId);
          localStorage.setItem("lastQR", qrId);

          const batchResult = await runBatchValidation({
            token,
            qrId,
            qrDecoded: true,
            mode: "live",
            qrConfidence: 0.98,
            decodeAttempts: 1,
          });

          if (!batchResult) {
            return;
          }

          const fallback = evaluatePatchFallback(batchResult.patch);
          if (fallback.shouldReject && batchResult.ai.mode === "decoder-first") {
            await failPatchAfterQr(
              fallback.userMessage,
              `QR-color rejected: ${fallback.reasonCodes.join(",") || "analysis-failed"} | confidence=${batchResult.patch.confidence.toFixed(2)}`,
              qrId,
              batchResult
            );
            return;
          }

          await finishWithResult(batchResult);
        },
        async () => {
          // html5-qrcode streams decode errors continuously; keep silent to avoid noisy UI.
        },
        { fps: 10, qrbox: { width: 280, height: 280 } }
      );
    } catch {
      await failScan("Không mở được camera. Hãy cấp quyền camera và thử lại.", "Camera unavailable");
    }
  }, [clearReaderDom, closeModal, failPatchAfterQr, failScan, finishWithResult, runBatchValidation, runColorFirstFlow, setAI, setError, setLastQrId, setScanPhase, setScanning, setStatus, stopTimer]);

  const startScan = useCallback(async () => {
    await startLiveScan();
  }, [startLiveScan]);

  const stopScan = useCallback(async () => {
    await closeModal();
    stopSpeechFeedback();
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCloseScanner();
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (aiResult) {
          setAI(null);
          void startScan();
          return;
        }

        if (!isScanningRef.current) {
          void startScan();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [aiResult, handleCloseScanner, open, setAI, startScan]);

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
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden ${lightMode ? "bg-slate-100" : "bg-slate-950"}`}
      role="dialog"
      aria-modal="true"
      aria-label="Màn hình quét QR sinh học"
    >
      <div id="reader" className={`absolute inset-0 z-0 h-full w-full ${aiResult ? "pointer-events-none" : ""}`} />
      <div className={`absolute inset-0 z-10 ${lightMode ? "bg-white/30" : "bg-black/40"}`} />

      <div className="absolute inset-x-0 top-0 z-30 px-4 pt-4">
        <div className={`mx-auto max-w-md rounded-3xl px-4 py-3 ring-1 backdrop-blur ${lightMode ? "bg-white/90 text-slate-900 ring-slate-200" : "bg-black/35 text-white ring-white/10"}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <BrandMark />
              <div className={`mt-1 text-xs ${lightMode ? "text-slate-600" : "text-white/70"}`}>
                Đưa mã vào giữa khung để quét nhanh hơn
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseScanner}
              aria-label="Đóng màn hình quét"
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.98] ${lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 ring-white/15"}`}
            >
              <IconX className="h-4 w-4" />
              Đóng
            </button>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2" aria-live="polite">
            {/* Live scanning dot — animated when actively scanning */}
            {isScanning && !aiResult && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" style={{ animationDuration: "1.4s" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
            )}
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
          <div className={`rounded-full px-4 py-2 text-sm font-medium ring-1 backdrop-blur ${lightMode ? "bg-white/90 text-slate-700 ring-slate-200" : "bg-black/40 text-white ring-white/10"}`} role="status" aria-live="polite">
            {scanPhase === "ai-analyzing"
              ? "Hệ thống đang phân tích màu sắc để kiểm tra độ tươi"
              : "Giữ máy ổn định, đưa mã vào khung và chờ trong giây lát."}
          </div>
        ) : null}

        {!aiResult && batchProgress.active ? (
          <div className={`w-full max-w-md rounded-2xl px-4 py-3 ring-1 backdrop-blur ${lightMode ? "bg-white/90 text-slate-800 ring-slate-200" : "bg-black/45 text-white ring-white/10"}`}>
            <div className="flex items-center justify-between gap-3 text-sm font-semibold">
              <span>Đang lấy nhiều khung hình</span>
              <span>{batchProgress.current}/{batchProgress.total}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-200"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-xs opacity-80">
              {batchProgress.variance !== null
                ? `Độ ổn định pH: ${batchProgress.variance.toFixed(3)} — càng thấp càng chắc`
                : "Đang chờ khung hình ổn định để chốt kết quả."}
            </div>
          </div>
        ) : null}

        <div className="relative w-[min(78vw,320px)] aspect-square max-w-md shrink-0 rounded-[2rem] border-[3px] border-emerald-400/80 shadow-[0_0_0_1px_rgba(16,185,129,0.15)]">
          <div className="absolute inset-5 rounded-[1.25rem] border border-emerald-200/80 bg-emerald-400/8" />
        </div>

        <div className={`w-full max-w-[320px] rounded-2xl px-3 py-2 ring-1 backdrop-blur ${lightMode ? "bg-white/90 text-slate-700 ring-slate-200" : "bg-black/45 text-white ring-white/10"}`}>
          <div className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${lightMode ? "text-slate-400" : "text-white/40"}`}>Thang màu mực sinh học</div>
          {/* Anthocyanin: tím → xanh lam → xanh lục → vàng */}
          <div
            className="h-2.5 w-full rounded-full"
            style={{ background: "linear-gradient(to right, #7c3aed, #818cf8, #60a5fa, #34d399, #fbbf24, #fde68a)" }}
          />
          <div className="mt-1.5 flex items-center justify-between text-[10px]">
            {["5.0", "6.5", "7.5", "8.5", "9.5"].map((v) => (
              <span key={v} className={lightMode ? "text-slate-400" : "text-white/40"}>{v}</span>
            ))}
          </div>
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
                  aria-label="Dừng quét camera"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-500/20 active:scale-[0.99]"
                >
                  <IconStop className="h-5 w-5" />
                  Dừng quét
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startScan}
                  aria-label="Bắt đầu quét camera"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
                >
                  <IconCamera className="h-5 w-5" />
                  Bắt đầu quét
                </button>
              )}

              <div className={`text-center text-[11px] ${lightMode ? "text-slate-500" : "text-white/70"}`}>
                Hệ thống đang phân tích màu sắc để kiểm tra độ tươi.
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur active:scale-[0.99] ring-1 ring-white/20"
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
          className="absolute inset-0 z-[10050] overflow-y-auto bg-gradient-to-b px-4 py-6 transition-[background-image] duration-700 ease-in-out sm:py-8"
          style={{
            backgroundImage: statusResultOverlay(aiResult.ph.status),
            color: statusBackground(aiResult.ph.status).text,
          }}
        >
          <div className="mx-auto w-full max-w-md">
            {/* Only show the "no ID" warning when qrId is genuinely absent */}
            {!aiResult.qr.qrId ? (
              <div className="mb-3 rounded-2xl border border-white/45 bg-black/55 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-black/25 backdrop-blur">
                Đã nhận diện màu sắc. Không tìm thấy ID sản phẩm.
              </div>
            ) : (
              <div className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-black/20 backdrop-blur">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                QR {aiResult.qr.qrId} · Đã nhận diện
              </div>
            )}
            <BioSmartScanResult
              currentPH={aiResult.ph.ph}
              qrId={aiResult.qr.qrId || null}
              onScanNext={() => {
                setAI(null);
                void startScan();
              }}
              onGoHome={handleCloseScanner}
              onViewDetails={onViewProduct}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}