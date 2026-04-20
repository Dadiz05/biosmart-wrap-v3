import { useEffect, useMemo, useState } from "react";
import QRScanner from "../components/QRScanner";
import ResultCard from "../components/ResultCard";
import ScanHistory from "../components/ScanHistory";
import BrandMark from "../components/BrandMark";
import Toast from "../components/Toast";
import { IconCamera, IconPrint } from "../components/Icons";
import { useStore } from "../store/useStore";

type DemoQr = {
  id: string;
  file: string;
  label: string;
  expected: string;
};

export default function Home() {
  const { status, lastError, aiResult, reset, history, clearHistory } = useStore();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("uiTheme") === "light");

  const demos: DemoQr[] = useMemo(
    () => [
      {
        id: "QR-024",
        file: "/qr/batch/qr-QR-024.svg",
        label: "Mẫu chuẩn Tươi",
        expected: "Tím • pH khoảng 5.65 • fresh",
      },
      {
        id: "QR-064",
        file: "/qr/batch/qr-QR-064.svg",
        label: "Mẫu chuẩn Giảm chất lượng",
        expected: "Xanh lam • pH khoảng 6.79 • degraded",
      },
      {
        id: "QR-102",
        file: "/qr/batch/qr-QR-102.svg",
        label: "Mẫu chuẩn Ôi thiu",
        expected: "Xanh lá • pH khoảng 7.88 • spoiled",
      },
      {
        id: "QR-142",
        file: "/qr/batch/qr-QR-142.svg",
        label: "Mẫu chuẩn Hỏng nặng",
        expected: "Xanh vàng • pH khoảng 9.01 • critical",
      },
    ],
    []
  );

  useEffect(() => {
    localStorage.setItem("uiTheme", lightMode ? "light" : "dark");
  }, [lightMode]);

  const toastTone = useMemo(() => {
    if (!lastError) return "info" as const;
    return "danger" as const;
  }, [lastError]);

  return (
    <div className={`min-h-dvh ${lightMode ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-50"}`}>
      <Toast
        open={toastOpen && !!lastError}
        message={lastError ?? ""}
        tone={toastTone}
        onClose={() => setToastOpen(false)}
      />

      <div className="mx-auto max-w-md px-4 pt-6 pb-10">
        <div
          className={`rounded-3xl p-5 ring-1 ${
            lightMode
              ? "bg-gradient-to-br from-emerald-100 via-white to-white ring-emerald-200"
              : "bg-gradient-to-br from-emerald-500/15 via-slate-900/60 to-slate-900 ring-white/10"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <BrandMark />
            <button
              type="button"
              onClick={() => setLightMode((value) => !value)}
              className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wide ring-1 active:scale-[0.98] ${
                lightMode ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-900 ring-white/20"
              }`}
            >
              {lightMode ? "Dark" : "White"}
            </button>
          </div>
          <div className="mt-1 text-2xl font-semibold leading-tight">
            Quét QR sinh học <br />
            1 khung QR, đọc ID và màu
          </div>
          <div className={`mt-3 text-sm ${lightMode ? "text-slate-600" : "text-white/70"}`}>
            QR là mã cố định để dặm/in thủ công. Camera sẽ đọc ID và phân tích màu ngay trên cùng vùng mã QR trong một lượt quét.
          </div>

          <div className="mt-5 grid gap-3">
            <button
              onClick={() => {
                reset();
                setScannerOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
            >
              <IconCamera className="h-5 w-5" />
              Bắt đầu quét
            </button>
            <div className={`text-center text-xs ${lightMode ? "text-slate-500" : "text-white/60"}`}>
              Luồng quét sẽ báo rõ QR, pH, trạng thái và độ tin cậy.
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className={`text-xs font-semibold mb-2 ${lightMode ? "text-slate-600" : "text-white/70"}`}>Kết quả</div>
          {status === "idle" && history.length === 0 && (
            <div className={`rounded-3xl p-4 ring-1 text-sm ${lightMode ? "bg-white text-slate-600 ring-slate-200" : "bg-white/5 text-white/70 ring-white/10"}`}>
              Sẵn sàng quét. Nhấn <span className={`font-semibold ${lightMode ? "text-slate-900" : "text-white"}`}>Bắt đầu quét</span> để vào camera.
            </div>
          )}

          {status === "error" && (
            <div className={`rounded-3xl p-4 ring-1 text-sm ${lightMode ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-rose-500/10 text-rose-100 ring-rose-500/20"}`}>
              {lastError ?? "Có lỗi. Vui lòng thử lại."}
              <div className="mt-3">
                <button
                  onClick={() => {
                    setToastOpen(true);
                  }}
                  className={`rounded-2xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.99] ${lightMode ? "bg-white text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/10"}`}
                >
                  Hiện thông báo
                </button>
              </div>
              {aiResult ? (
                <div className="mt-4">
                  <ResultCard lightMode={lightMode} />
                </div>
              ) : null}
            </div>
          )}

          {status === "done" && <ResultCard lightMode={lightMode} />}
          {status === "loading" && (
            <div className={`rounded-3xl p-4 ring-1 text-sm ${lightMode ? "bg-white text-slate-600 ring-slate-200" : "bg-white/5 text-white/70 ring-white/10"}`}>
              Đang phân tích live… {aiResult ? "(đang cập nhật)" : ""}
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className={`text-xs font-semibold mb-2 ${lightMode ? "text-slate-600" : "text-white/70"}`}>Lịch sử quét thực phẩm</div>
          <ScanHistory items={history} onClear={clearHistory} lightMode={lightMode} />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-xs font-semibold ${lightMode ? "text-slate-600" : "text-white/70"}`}>Demo QR (tải / in nhanh)</div>
            <button
              onClick={() => window.print()}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.99] ${
                lightMode ? "bg-white text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/10"
              }`}
            >
              <IconPrint className="h-4 w-4" />
              In tất cả
            </button>
          </div>

          <div className="grid gap-3">
            {demos.map((demo) => (
              <div
                key={demo.id}
                className={`rounded-3xl p-4 ring-1 ${lightMode ? "bg-white ring-slate-200" : "bg-white/5 ring-white/10"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold ${lightMode ? "text-slate-900" : "text-white"}`}>{demo.label}</div>
                    <div className={`mt-1 text-xs ${lightMode ? "text-slate-600" : "text-white/70"}`}>{demo.expected}</div>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-white p-2 ring-1 ring-black/10">
                    <img src={demo.file} alt={demo.id} className="h-24 w-24" loading="lazy" />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={demo.file}
                    download
                    className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-black/10 active:scale-[0.99]"
                  >
                    Tải SVG
                  </a>
                  <a
                    href={demo.file}
                    target="_blank"
                    rel="noreferrer"
                    className={`rounded-2xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.99] ${
                      lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/10"
                    }`}
                  >
                    Mở tab mới
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <QRScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        lightMode={lightMode}
      />
    </div>
  );
}
