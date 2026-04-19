import QRScanner from "../components/QRScanner";
import ResultCard from "../components/ResultCard";
import { useStore } from "../store/useStore";
import { useMemo, useState } from "react";
import Toast from "../components/Toast";
import { IconCamera, IconPrint } from "../components/Icons";

type DemoQr = {
  id: string;
  file: string;
  label: string;
  expected: string;
  productHint: string;
};

export default function Home() {
  const { status, lastError, aiResult, reset } = useStore();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const demos: DemoQr[] = useMemo(
    () => [
      {
        id: "789",
        file: "/qr/demo-789.svg",
        label: "Demo QR #789",
        expected: "Cảnh báo (warning) • màu blue • pH ~7.2",
        productHint: "Gà phi lê • Green Farm • 2026-04-03",
      },
      {
        id: "999",
        file: "/qr/demo-999.svg",
        label: "Demo QR #999",
        expected: "Nguy hiểm (spoiled) • màu yellow • pH ~10.6",
        productHint: "Tôm sú • Ocean Fresh • 2026-04-04",
      },
    ],
    []
  );

  const toastTone = useMemo(() => {
    if (!lastError) return "info" as const;
    return "danger" as const;
  }, [lastError]);

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-50">
      <Toast
        open={toastOpen && !!lastError}
        message={lastError ?? ""}
        tone={toastTone}
        onClose={() => setToastOpen(false)}
      />

      <div className="mx-auto max-w-md px-4 pt-6 pb-10">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 via-slate-900/60 to-slate-900 p-5 ring-1 ring-white/10">
          <div className="text-sm font-semibold text-white/90">BioSmart Wrap</div>
          <div className="mt-1 text-2xl font-semibold leading-tight">
            Quét QR sinh học <br />
            đánh giá độ tươi thực phẩm
          </div>
          <div className="mt-3 text-sm text-white/70">
            Nếu QR không quét được, hệ thống sẽ chốt chặn:{" "}
            <span className="font-semibold text-white">
              QR bị vô hiệu hóa → có thể thực phẩm đã hỏng
            </span>
            .
          </div>

          <div className="mt-5 grid gap-3">
            <button
              onClick={() => {
                reset();
                setScannerOpen(true);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
            >
              <IconCamera className="h-5 w-5" />
              Scan QR
            </button>
            <div className="text-center text-xs text-white/60">
              Mẹo: đặt QR trong khung, tránh lóa, giữ ổn định 1–2 giây.
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="text-xs font-semibold text-white/70 mb-2">Kết quả</div>
          {status === "idle" && (
            <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 text-sm text-white/70">
              Chưa có kết quả. Nhấn <span className="font-semibold text-white">Scan QR</span> để bắt đầu.
            </div>
          )}

          {status === "error" && (
            <div className="rounded-3xl bg-rose-500/10 p-4 ring-1 ring-rose-500/20 text-sm text-rose-100">
              {lastError ?? "⚠️ Có lỗi. Vui lòng thử lại."}
              <div className="mt-3">
                <button
                  onClick={() => {
                    setToastOpen(true);
                  }}
                  className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 active:scale-[0.99]"
                >
                  Hiện thông báo
                </button>
              </div>
            </div>
          )}

          {status === "done" && <ResultCard />}
          {status === "loading" && (
            <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10 text-sm text-white/70">
              Đang phân tích… {aiResult ? "(đang cập nhật)" : ""}
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-white/70">Demo QR (tải / in nhanh)</div>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold ring-1 ring-white/10 active:scale-[0.99]"
            >
              <IconPrint className="h-4 w-4" />
              In tất cả
            </button>
          </div>

          <div className="grid gap-3">
            {demos.map((d) => (
              <div
                key={d.id}
                className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{d.label}</div>
                    <div className="mt-1 text-xs text-white/70">{d.expected}</div>
                    <div className="mt-1 text-xs text-white/60">{d.productHint}</div>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-white p-2 ring-1 ring-black/10">
                    <img
                      src={d.file}
                      alt={`QR demo ${d.id}`}
                      className="h-24 w-24"
                      loading="lazy"
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={d.file}
                    download
                    className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-black/10 active:scale-[0.99]"
                  >
                    Tải SVG
                  </a>
                  <a
                    href={d.file}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 active:scale-[0.99]"
                  >
                    Mở tab mới
                  </a>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(d.id);
                      } catch {
                        // ignore
                      }
                    }}
                    className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 active:scale-[0.99]"
                  >
                    Copy mã: {d.id}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 text-[11px] text-white/50">
            Gợi ý: mở SVG ở tab mới rồi in (print) sẽ nét nhất khi dán lên bao bì.
          </div>
        </div>
      </div>

      <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  );
}