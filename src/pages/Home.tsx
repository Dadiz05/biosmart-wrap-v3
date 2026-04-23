import { Suspense, lazy, useEffect, useState } from "react";
import ResultCard from "../components/ResultCard";
import ScanHistory from "../components/ScanHistory";
import BrandMark from "../components/BrandMark";
import FeedbackSettings from "../components/FeedbackSettings";
import Toast from "../components/Toast";
import ProductMetadataDialog from "../components/ProductMetadataDialog";
import { IconCamera, IconPrint, IconSettings, IconX } from "../components/Icons";
import { defaultFeedbackSettings, useStore } from "../store/useStore";

const QRScanner = lazy(() => import("../components/QRScanner"));

const qrShowcase = [
  {
    id: "BS-2026-X9",
    file: "/qr/fresh.svg",
    label: "Tươi",
    expected: "pH 5.0 - 6.0 • màu tím",
  },
  {
    id: "BS-2026-X9",
    file: "/qr/degraded.svg",
    label: "Giảm chất lượng",
    expected: "pH 6.1 - 7.0 • màu xanh lam",
  },
  {
    id: "BS-2026-X9",
    file: "/qr/spoiled.svg",
    label: "Ôi thiu",
    expected: "pH 7.1 - 8.4 • màu xanh lá",
  },
  {
    id: "BS-2026-X9",
    file: "/qr/critical.svg",
    label: "Hỏng nặng",
    expected: "pH 8.5 - 9.5 • màu vàng",
  },
];

export default function Home() {
  const { status, lastError, aiResult, reset, history, clearHistory, setFeedbackSettings } = useStore();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<"bioInk" | "wrap" | null>(null);
  const [metadataQrId, setMetadataQrId] = useState<string | null>(null);
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("uiTheme") === "light");

  useEffect(() => {
    localStorage.setItem("uiTheme", lightMode ? "light" : "dark");
  }, [lightMode]);

  // Load feedback settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("feedbackSettings");
    if (saved) {
      try {
        setFeedbackSettings({ ...defaultFeedbackSettings, ...JSON.parse(saved) });
      } catch (error) {
        console.debug("Failed to load feedback settings:", error);
      }
    }
  }, [setFeedbackSettings]);

  const toastTone = lastError ? "danger" : "info";

  const handleOpenMetadata = (qrId: string) => {
    setMetadataQrId(qrId);
  };

  return (
    <div className={`min-h-dvh ${lightMode ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-50"}`}>
      <Toast open={toastOpen && !!lastError} message={lastError ?? ""} tone={toastTone} onClose={() => setToastOpen(false)} />

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
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen((value) => !value)}
                aria-label="Mở cài đặt"
                className={`shrink-0 rounded-xl p-2 ring-1 active:scale-[0.98] ${
                  lightMode ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-900 ring-white/20"
                }`}
              >
                <IconSettings className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-1 text-2xl font-semibold leading-tight">
            Quét QR sinh học đánh giá<br />
            độ tươi của thực phẩm
          </div>
          <div className={`mt-3 text-sm ${lightMode ? "text-slate-600" : "text-white/70"}`}>
            Camera sẽ nhận biết mã, sau đó đọc màu của mẫu để đưa ra đánh giá về độ tươi, trạng thái và độ tin cậy của sản phẩm.
          </div>

          {settingsOpen ? (
            <div className={`mt-4 rounded-2xl p-3 ring-1 ${lightMode ? "bg-white text-slate-700 ring-slate-200" : "bg-black/30 text-white ring-white/15"}`}>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide opacity-80">Tùy chỉnh nhanh</div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${lightMode ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white/70"}`}
                >
                  <span className="inline-flex items-center gap-1"><IconX className="h-3.5 w-3.5" /> Đóng</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLightMode((value) => !value)}
                className={`mb-3 w-full rounded-xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.99] ${lightMode ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-900 ring-white/20"}`}
              >
                {lightMode ? "Chuyển về chế độ tối" : "Chuyển về chế độ sáng"}
              </button>

              <FeedbackSettings />

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInfoModal("bioInk")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/15"}`}
                >
                  Tìm hiểu cơ chế mực sinh học
                </button>
                <button
                  type="button"
                  onClick={() => setInfoModal("wrap")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/15"}`}
                >
                  Màng thực phẩm BioSmart Wrap
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => {
                reset();
                setScannerOpen(true);
              }}
              aria-label="Mở camera để bắt đầu quét QR sinh học"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 active:scale-[0.99]"
            >
              <IconCamera className="h-5 w-5" />
              Bắt đầu quét
            </button>
            <div className={`text-center text-xs ${lightMode ? "text-slate-500" : "text-white/60"}`}>
              Hệ thống hoạt động tốt nhất trong ánh sáng tự nhiên, tránh phản chiếu mạnh trên bề mặt mẫu.
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

          {status === "done" && <ResultCard lightMode={lightMode} onViewProduct={handleOpenMetadata} />}
          {status === "loading" && (
            <div className={`rounded-3xl p-4 ring-1 text-sm ${lightMode ? "bg-white text-slate-600 ring-slate-200" : "bg-white/5 text-white/70 ring-white/10"}`}>
              Đang phân tích live… {aiResult ? "(đang cập nhật)" : ""}
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className={`text-xs font-semibold mb-2 ${lightMode ? "text-slate-600" : "text-white/70"}`}>Lịch sử quét</div>
          <ScanHistory items={history} onClear={clearHistory} lightMode={lightMode} />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`text-xs font-semibold ${lightMode ? "text-slate-600" : "text-white/70"}`}>4 mã QR BioSmart mới</div>
            <button
              onClick={() => window.print()}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.99] ${
                lightMode ? "bg-white text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/10"
              }`}
            >
              <IconPrint className="h-4 w-4" />
              In
            </button>
          </div>

          <div className={`rounded-3xl p-4 ring-1 ${lightMode ? "bg-white ring-slate-200" : "bg-white/5 ring-white/10"}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {qrShowcase.map((item) => (
                <div key={`${item.label}-${item.file}`} className={`rounded-2xl p-3 ring-1 ${lightMode ? "bg-slate-50 ring-slate-200" : "bg-white/5 ring-white/10"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${lightMode ? "text-slate-900" : "text-white"}`}>{item.label}</div>
                      <div className={`mt-1 text-xs ${lightMode ? "text-slate-600" : "text-white/70"}`}>{item.expected}</div>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-white p-2 ring-1 ring-black/10">
                      <img src={item.file} alt={item.label} className="h-24 w-24" loading="lazy" />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={item.file}
                      download
                      className="rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-black/10 active:scale-[0.99]"
                    >
                      Tải SVG
                    </a>
                    <a
                      href={item.file}
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
      </div>

      <ProductMetadataDialog open={metadataQrId !== null} qrId={metadataQrId} lightMode={lightMode} onClose={() => setMetadataQrId(null)} />

      <Suspense
        fallback={
          <div className="fixed inset-0 z-[9998] grid place-items-center bg-slate-950/65 text-white">
            <div className="rounded-2xl bg-black/55 px-4 py-3 text-sm ring-1 ring-white/15">Đang tải camera quét...</div>
          </div>
        }
      >
        <QRScanner open={scannerOpen} onClose={() => setScannerOpen(false)} lightMode={lightMode} onViewProduct={handleOpenMetadata} />
      </Suspense>

      {infoModal ? (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl p-5 ring-1 ${lightMode ? "bg-white text-slate-900 ring-slate-200" : "bg-slate-900 text-white ring-white/10"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">Tìm hiểu nhanh</div>
                <h3 className="mt-1 text-xl font-black">
                  {infoModal === "bioInk" ? "Cơ chế mực sinh học" : "Màng thực phẩm BioSmart Wrap"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className={`rounded-xl p-2 ring-1 ${lightMode ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-white/10 text-white ring-white/10"}`}
                aria-label="Đóng thông tin"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div className={`mt-4 space-y-3 text-sm leading-6 ${lightMode ? "text-slate-700" : "text-white/78"}`}>
              {infoModal === "bioInk" ? (
                <>
                  <p>Mực sinh học đổi màu theo biến đổi hóa học trong thực phẩm. Khi môi trường xung quanh thay đổi, màu trên mã sẽ dịch chuyển để phản ánh mức độ tươi.</p>
                  <p>Cách này giúp người dùng nhìn nhanh bằng mắt thường, không cần đọc thêm thông số kỹ thuật phức tạp.</p>
                </>
              ) : (
                <>
                  <p>Màng thực phẩm BioSmart Wrap được thiết kế để vừa bọc bảo quản vừa mang lớp mã màu sinh học bên ngoài.</p>
                  <p>Nhờ đó, cùng một tấm màng có thể giữ thực phẩm và cung cấp tín hiệu trực quan về tình trạng của sản phẩm.</p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${lightMode ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-900 ring-white/15"}`}
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
