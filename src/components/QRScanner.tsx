import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getProduct } from "../services/api";
import { analyzeColor } from "../services/aiService";
import { useStore } from "../store/useStore";
import { useCamera } from "../hooks/useCamera";
import Spinner from "./Spinner";
import { IconAlertTriangle, IconCamera, IconCheckCircle, IconStop, IconX } from "./Icons";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function QRScanner({ open, onClose }: Props) {
  const { setProduct, setAI, setStatus, setError, pushHistory, reset, product, aiResult, lastError, status } =
    useStore();

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<"fresh" | "warning" | "danger" | "blocked" | null>(null);
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
        product: null,
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
          try {
            stopTimer();

            localStorage.setItem("lastQR", decodedText);

            const frame = captureFrame({ maxSize: 512, quality: 0.82 });
            const product = await getProduct(decodedText);
            setProduct(product);

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
            if (ai.status === "fresh") {
              setResult("fresh");
            } else if (ai.status === "warning") {
              setResult("warning");
            } else {
              setResult("danger");
            }

            pushHistory({
              id: crypto.randomUUID(),
              qrId: decodedText,
              scannedAt: new Date().toISOString(),
              status: ai.status,
              product,
              aiResult: ai,
            });

            await stopScan();
          } catch (err) {
            console.error(err);
            await stopScan();
            setStatus("error");
            if (axios.isAxiosError(err)) {
              if (err.response?.status === 404) {
                setError("⚠️ Mã QR không có trong hệ thống (sai mã hoặc chưa đăng ký).");
              } else if (err.code === "ECONNABORTED") {
                setError("⚠️ Máy chủ phản hồi quá lâu. Hãy kiểm tra backend và thử lại.");
              } else if (!err.response) {
                setError(
                  "⚠️ Không kết nối được API: chạy backend (port 5000), frontend `npm run dev` (proxy /api). Trên điện thoại mở URL máy tính trong LAN, không mở file tĩnh."
                );
              } else {
                setError("⚠️ Lỗi khi tải thông tin sản phẩm. Vui lòng thử lại.");
              }
            } else {
              setError("⚠️ Có lỗi khi phân tích. Vui lòng thử lại.");
            }
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
    void closeModal();
  }, [closeModal, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
      {/* Camera */}
      <div
        id="reader"
        className={`absolute inset-0 z-0 w-full h-full ${result ? "pointer-events-none" : ""}`}
      />

      {/* Overlay */}
      <div className="absolute inset-0 z-10 bg-black/45 pointer-events-none" />

      {/* Khung scan */}
      {isScanning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-[72vw] max-w-[320px] aspect-square rounded-3xl ring-4 ring-emerald-400/90 relative">
            <div className="absolute inset-x-2 top-2 h-1 rounded-full bg-emerald-300/90 animate-pulse" />
            <div className="absolute inset-6 rounded-2xl border border-white/10" />
          </div>

          {/* TEXT ĐANG QUÉT */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-white ring-1 ring-white/10">
            <Spinner />
            <p className="text-sm font-medium">Đang quét QR…</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 z-30 w-full px-4 pt-4">
        <div className="mx-auto max-w-md rounded-2xl bg-black/35 px-4 py-3 text-white ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">BioSmart Wrap</div>
              <div className="text-xs text-white/70">Quét QR sinh học • AI màu → pH</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await closeModal();
                reset();
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold ring-1 ring-white/15 active:scale-[0.98]"
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
          <div className="mx-auto max-w-md rounded-3xl bg-black/35 p-3 ring-1 ring-white/10 backdrop-blur">
            {!isScanning && status === "error" && lastError && (
              <div className="mb-3 rounded-2xl bg-rose-500/20 px-3 py-2 text-center text-xs font-medium text-rose-100 ring-1 ring-rose-400/30">
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
            <div className="mt-2 text-center text-[11px] text-white/70">
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
              : result === "blocked" || result === "warning"
                ? "bg-amber-600"
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
                ? "Thực phẩm còn tươi"
                : result === "blocked"
                  ? "Không thể quét QR"
                  : result === "warning"
                    ? "Cảnh báo chất lượng"
                    : "Không an toàn"}
            </h1>

          {aiResult && (
            <p className="mb-2">pH: {aiResult.ph}</p>
          )}

          {product && (
            <p className="text-sm opacity-80">
              {product.name} - {product.supplier}
            </p>
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