import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analyzeColor } from "../services/aiService";
import { useStore } from "../store/useStore";
import { useCamera } from "../hooks/useCamera";
import Spinner from "./Spinner";
import { IconAlertTriangle, IconCamera, IconCheckCircle, IconStop, IconX } from "./Icons";
import BrandMark from "./BrandMark";

type Props = {
  open: boolean;
  onClose: () => void;
  lightMode?: boolean;
};

export default function QRScanner({ open, onClose, lightMode = false }: Props) {
  const { setAI, setLastQrId, setStatus, setError, pushHistory, reset, aiResult, lastError, status } =
    useStore();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const handledDecodeRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<"fresh" | "degraded" | "spoiled" | "critical" | "blocked" | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { captureFrame } = useCamera("reader");

  const scanBox = useMemo(() => ({ width: 260, height: 260 }), []);

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
    const el = document.getElementById("reader");
    if (!el) return;
    // html5-qrcode leaves video/canvas nodes; clearing avoids stacking + weird hit targets
    el.innerHTML = "";
  }, []);

  const safeStopScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      // html5-qrcode throws if stop is called when not running
      await s.stop();
    } catch {
      // ignore
    } finally {
      try {
        await s.clear();
      } catch {
        // ignore
      }
    }
  }, []);

  const closeModal = useCallback(async () => {
    stopTimer();
    await safeStopScanner();
    scannerRef.current = null;
    handledDecodeRef.current = false;
    setScanning(false);
    setResult(null);
    clearReaderDom();
  }, [clearReaderDom, safeStopScanner, setScanning, stopTimer]);

  const flashScreen = useCallback(() => {
    const flash = document.createElement("div");
    flash.className =
      "fixed inset-0 bg-white z-[10100] opacity-80 transition-opacity duration-300";
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.style.opacity = "0";
      setTimeout(() => {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 300);
    }, 100);
  }, []);

  const stopScan = useCallback(async () => {
    if (!scannerRef.current) return;
    if (!isScanningRef.current) return;
    await safeStopScanner();
    setScanning(false);
  }, [safeStopScanner, setScanning]);

  // 🚀 START SCAN
  const startScan = async () => {
    if (isScanningRef.current) return;

    await closeModal(); // ensure a clean slate
    clearReaderDom();

    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    setScanning(true);
    handledDecodeRef.current = false;
    setResult(null);
    setStatus("loading");
    setError(null);

    // ⏱ Timeout 5s → fail
    stopTimer();
    scanTimeoutRef.current = setTimeout(() => {
      setResult("blocked");
      setStatus("error");
      setError("⚠️ Không thể quét mã. Có thể thực phẩm đã hỏng (QR bị vô hiệu hóa).");
      setScanning(false);
      void safeStopScanner();
      pushHistory({
        id: crypto.randomUUID(),
        qrId: null,
        scannedAt: new Date().toISOString(),
        status: "blocked",
        reason: "QR scan timeout / blocked",
        aiResult: null,
      });
    }, 5200);

    await scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: scanBox,
        },
        async (decodedText: string) => {
          if (handledDecodeRef.current) return;
          handledDecodeRef.current = true;

          try {
            stopTimer();

            localStorage.setItem("lastQR", decodedText);
            setLastQrId(decodedText);

            const frame = captureFrame({ maxSize: 512, quality: 0.82 });
            const ai = await analyzeColor(
              frame
                ? { imageData: frame.imageData, previewDataUrl: frame.previewDataUrl }
                : { previewDataUrl: undefined as unknown as string }
            );
            setAI(ai);

            setStatus("done");

            // 📳 rung
            navigator.vibrate?.(200);

            // 💡 flash effect
            flashScreen();

            // 🎯 result
            setResult(ai.status);

            pushHistory({
              id: crypto.randomUUID(),
              qrId: decodedText,
              scannedAt: new Date().toISOString(),
              status: ai.status,
              aiResult: ai,
            });

            await stopScan();
          } catch (err) {
            console.error(err);
            await stopScan();
            handledDecodeRef.current = false;
            setStatus("error");
            setError("⚠️ Có lỗi khi phân tích pH/màu. Vui lòng thử lại.");
          }
        },
        () => {}
      )
      .catch((err) => {
        console.error("Camera error:", err);
        setError("⚠️ Không mở được camera. Hãy cấp quyền camera và thử lại.");
        setScanning(false);
        setStatus("error");
      });
  };

  useEffect(() => {
    return () => {
      stopTimer();
      void safeStopScanner();
    };
  }, [safeStopScanner, stopTimer]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) return;
    const t = requestAnimationFrame(() => {
      void closeModal();
    });
    return () => cancelAnimationFrame(t);
  }, [closeModal, open]);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[9999] overflow-hidden ${lightMode ? "bg-white" : "bg-black"}`}>
      {/* Camera */}
      <div
        id="reader"
        className={`absolute inset-0 z-0 w-full h-full ${result ? "pointer-events-none" : ""}`}
      />

      {/* Overlay */}
      <div
        className={`absolute inset-0 z-10 pointer-events-none ${
          lightMode ? "bg-white/35" : "bg-black/45"
        }`}
      />

      {/* Khung scan */}
      {isScanning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-[260px] max-w-[72vw] aspect-square rounded-[28px] border-[4px] border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]">
            <div className="absolute inset-5 rounded-2xl border border-emerald-300/45" />
          </div>

          {/* TEXT ĐANG QUÉT */}
          <div
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1 ${
              lightMode ? "bg-white/90 text-slate-700 ring-slate-300" : "bg-black/40 text-white ring-white/10"
            }`}
          >
            <Spinner />
            <p className="text-sm font-medium">Đang quét QR…</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 z-30 w-full px-4 pt-4">
        <div
          className={`mx-auto max-w-md rounded-2xl px-4 py-3 ring-1 backdrop-blur ${
            lightMode ? "bg-white/90 text-slate-900 ring-slate-200" : "bg-black/35 text-white ring-white/10"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <BrandMark />
              <div className={`mt-1 text-xs ${lightMode ? "text-slate-600" : "text-white/70"}`}>
                Quét QR sinh học • AI màu → pH
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await closeModal();
                reset();
                onClose();
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.98] ${
                lightMode
                  ? "bg-slate-100 text-slate-700 ring-slate-200"
                  : "bg-white/10 ring-white/15"
              }`}
            >
              <IconX className="h-4 w-4" />
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Button */}
      {!result && (
        <div className="absolute bottom-0 z-30 w-full px-4 pb-6">
          <div
            className={`mx-auto max-w-md rounded-3xl p-3 ring-1 backdrop-blur ${
              lightMode ? "bg-white/90 ring-slate-200" : "bg-black/35 ring-white/10"
            }`}
          >
            {!isScanning && status === "error" && lastError && (
              <div
                className={`mb-3 rounded-2xl px-3 py-2 text-center text-xs font-medium ring-1 ${
                  lightMode
                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                    : "bg-rose-500/20 text-rose-100 ring-rose-400/30"
                }`}
              >
                {lastError}
              </div>
            )}
            {!isScanning ? (
              <button
                type="button"
                onClick={startScan}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
              >
                <IconCamera className="h-5 w-5" />
                Bắt đầu quét
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScan}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-500/20 active:scale-[0.99]"
              >
                <IconStop className="h-5 w-5" />
                Dừng quét
              </button>
            )}
            <div className={`mt-2 text-center text-[11px] ${lightMode ? "text-slate-500" : "text-white/70"}`}>
              Đưa QR vào trong khung, giữ ổn định 1–2 giây.
            </div>
          </div>
        </div>
      )}

      {/* 🎯 RESULT */}
      {result && (
        <div
          className={`fixed inset-0 z-[10050] flex flex-col items-center justify-center text-white text-center ${
            result === "fresh"
              ? "bg-emerald-600"
              : result === "degraded"
                ? "bg-amber-600"
                : result === "spoiled"
                  ? "bg-lime-600"
                : "bg-rose-600"
          } pointer-events-auto`}
        >
          <div className="px-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              {result === "fresh" ? (
                <IconCheckCircle className="h-8 w-8" />
              ) : (
                <IconAlertTriangle className="h-8 w-8" />
              )}
            </div>

            <h1 className="text-3xl font-bold mb-3">
              {result === "fresh"
                ? "Tươi"
                : result === "blocked"
                  ? "Không thể quét QR"
                  : result === "degraded"
                    ? "Giảm chất lượng"
                    : result === "spoiled"
                      ? "Ôi thiu"
                      : "Hỏng nặng"}
            </h1>

          {aiResult && (
            <>
              <p className="mb-1">Trạng thái: <span className="font-semibold">
                {aiResult.status === "fresh"
                  ? "Tươi"
                  : aiResult.status === "degraded"
                    ? "Giảm chất lượng"
                    : aiResult.status === "spoiled"
                      ? "Ôi thiu"
                      : "Hỏng nặng"}
              </span></p>
              <p className="mb-1">pH: <span className="font-semibold">{aiResult.ph}</span></p>
              <p className="text-sm opacity-95">
                Màu nền: <span className="font-semibold">
                  {aiResult.color === "purple"
                    ? "Tím"
                    : aiResult.color === "blue"
                      ? "Xanh lam"
                      : aiResult.color === "green"
                        ? "Xanh"
                        : "Xanh vàng"}
                </span>
              </p>
            </>
          )}

          <button
            type="button"
            onClick={async () => {
              setResult(null);
              await startScan();
            }}
            className="mt-6 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-black font-semibold shadow-lg shadow-black/15 active:scale-[0.99]"
          >
            <IconCamera className="h-5 w-5" />
            Quét lại
          </button>
          <button
            type="button"
            onClick={async () => {
              await closeModal();
              reset();
              onClose();
            }}
            className="mt-3 inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-black/15 px-6 py-3 text-sm font-semibold ring-1 ring-white/20 backdrop-blur active:scale-[0.99]"
          >
            <IconX className="h-4 w-4" />
            Về trang chính
          </button>
          </div>
        </div>
      )}
    </div>
  );
}