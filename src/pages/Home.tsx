import { Suspense, lazy, useEffect, useState } from "react";
import ResultCard from "../components/ResultCard";
import ScanHistory from "../components/ScanHistory";
import BrandMark from "../components/BrandMark";
import FeedbackSettings from "../components/FeedbackSettings";
import Toast from "../components/Toast";
import ProductMetadataDialog from "../components/ProductMetadataDialog";
import {
  IconCamera,
  IconPrint,
  IconSettings,
  IconX,
  IconDownload,
  IconExternalLink,
} from "../components/Icons";
import { defaultFeedbackSettings, useStore } from "../store/useStore";

const QRScanner = lazy(() => import("../components/QRScanner"));

/* ─────────────────────────── constants ──────────────────────────── */

const qrShowcase = [
  {
    id: "fresh",
    file: "/qr/fresh.svg",
    label: "Tươi",
    expected: "pH 5.0 – 6.0",
    inkNote: "Mực Anthocyanin • màu tím",
    barFrom: "#7c3aed",   // purple
    barTo:   "#8b5cf6",   // purple-violet (tight range, stays purple)
    dotColor: "bg-violet-500",
    textAccent: "text-violet-600 dark:text-violet-400",
  },
  {
    id: "degraded",
    file: "/qr/degraded.svg",
    label: "Giảm chất lượng",
    expected: "pH 6.5 – 7.0",
    inkNote: "Mực Anthocyanin • màu xanh lam",
    barFrom: "#6d86e8",   // blue-purple transition
    barTo:   "#60a5fa",   // blue
    dotColor: "bg-blue-400",
    textAccent: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "spoiled",
    file: "/qr/spoiled.svg",
    label: "Ôi thiu",
    expected: "pH 7.5 – 8.5",
    inkNote: "Mực Anthocyanin • màu xanh lục",
    barFrom: "#34d399",   // teal-green
    barTo:   "#22c55e",   // green
    dotColor: "bg-teal-400",
    textAccent: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "critical",
    file: "/qr/critical.svg",
    label: "Hỏng nặng",
    expected: "pH 8.5 – 9.5",
    inkNote: "Mực Anthocyanin • màu vàng",
    barFrom: "#fbbf24",   // amber
    barTo:   "#fde68a",   // yellow
    dotColor: "bg-amber-400",
    textAccent: "text-amber-600 dark:text-amber-400",
  },
];

/* ──────────────────────── sub-components ────────────────────────── */

/** Radial "empty state" illustration */
function EmptyIllustration({ lightMode }: { lightMode: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="relative">
        {/* Pulsing ring */}
        <span
          className={`absolute inset-0 animate-ping rounded-full opacity-30 ${
            lightMode ? "bg-emerald-300" : "bg-emerald-500"
          }`}
          style={{ animationDuration: "2.4s" }}
        />
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-full ring-2 ${
            lightMode
              ? "bg-emerald-50 ring-emerald-200"
              : "bg-emerald-500/10 ring-emerald-500/30"
          }`}
        >
          <IconCamera
            className={`h-7 w-7 ${lightMode ? "text-emerald-600" : "text-emerald-400"}`}
          />
        </div>
      </div>
      <p
        className={`text-center text-sm leading-5 ${
          lightMode ? "text-slate-500" : "text-white/55"
        }`}
      >
        Sẵn sàng quét.{" "}
        <span className={lightMode ? "font-semibold text-slate-800" : "font-semibold text-white"}>
          Nhấn bắt đầu
        </span>{" "}
        để vào camera.
      </p>
    </div>
  );
}

/** Full-width gradient bar representing the ink colour transition for this status */
function PhStrip({ from, to }: { from: string; to: string }) {
  return (
    <div
      className="mt-3 h-2 w-full rounded-full"
      style={{ background: `linear-gradient(to right, ${from}, ${to})` }}
    />
  );
}

/** Single QR showcase card */
function QrCard({
  item,
  lightMode,
}: {
  item: (typeof qrShowcase)[0];
  lightMode: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl ring-1 transition-all duration-300 ${
        hovered ? "scale-[1.015] shadow-xl" : "scale-100 shadow-sm"
      } ${
        lightMode
          ? "bg-white ring-slate-200 hover:ring-emerald-200"
          : "bg-white/5 ring-white/10 hover:ring-white/25"
      }`}
    >
      {/* QR image area */}
      <div
        className={`relative flex items-center justify-center p-4 ${
          lightMode ? "bg-slate-50" : "bg-white/5"
        }`}
      >
        <img
          src={item.file}
          alt={item.label}
          className="h-[88px] w-[88px] transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Status dot */}
        <span
          className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ring-2 ${item.dotColor} ${
            lightMode ? "ring-white" : "ring-slate-900"
          }`}
        />
        {/* Action icons — appear on hover */}
        <div
          className={`absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 py-2 backdrop-blur-sm transition-all duration-200 ${
            hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          } ${lightMode ? "bg-white/80" : "bg-slate-900/70"}`}
        >
          <a
            href={item.file}
            download
            onClick={(e) => e.stopPropagation()}
            aria-label="Tải SVG"
            className={`rounded-lg p-1.5 transition ${
              lightMode
                ? "text-slate-700 hover:bg-slate-100"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            <IconDownload className="h-4 w-4" />
          </a>
          <a
            href={item.file}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mở tab mới"
            className={`rounded-lg p-1.5 transition ${
              lightMode
                ? "text-slate-700 hover:bg-slate-100"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            <IconExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div
          className={`text-sm font-bold leading-tight ${
            lightMode ? "text-slate-900" : "text-white"
          }`}
        >
          {item.label}
        </div>
        <div className={`text-xs font-semibold ${item.textAccent}`}>
          {item.expected}
        </div>
        {/* Ink note — shown on hover */}
        <div
          className={`overflow-hidden text-[10px] leading-tight transition-all duration-200 ${
            hovered ? "max-h-10 opacity-100 mt-0.5" : "max-h-0 opacity-0"
          } ${lightMode ? "text-slate-500" : "text-white/55"}`}
        >
          {item.inkNote}
        </div>
        {/* pH colour strip */}
        <PhStrip from={item.barFrom} to={item.barTo} />
      </div>
    </div>
  );
}

/* ─────────────────────────── main page ──────────────────────────── */

export default function Home() {
  const {
    status,
    lastError,
    aiResult,
    reset,
    history,
    clearHistory,
    setFeedbackSettings,
  } = useStore();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<"bioInk" | "wrap" | null>(null);
  const [metadataQrId, setMetadataQrId] = useState<string | null>(null);
  const [lightMode, setLightMode] = useState(
    () => localStorage.getItem("uiTheme") === "light"
  );

  useEffect(() => {
    localStorage.setItem("uiTheme", lightMode ? "light" : "dark");
  }, [lightMode]);

  useEffect(() => {
    const saved = localStorage.getItem("feedbackSettings");
    if (saved) {
      try {
        setFeedbackSettings({
          ...defaultFeedbackSettings,
          ...JSON.parse(saved),
        });
      } catch (error) {
        console.debug("Failed to load feedback settings:", error);
      }
    }
  }, [setFeedbackSettings]);

  const toastTone = lastError ? "danger" : "info";
  const handleOpenMetadata = (qrId: string) => setMetadataQrId(qrId);

  /* ── utility classes ── */
  const card = lightMode
    ? "bg-white ring-1 ring-slate-200"
    : "bg-white/[0.06] ring-1 ring-white/10";
  const sectionLabel = `text-[10px] font-bold uppercase tracking-[0.18em] ${
    lightMode ? "text-slate-400" : "text-white/40"
  }`;

  return (
    <div
      className={`min-h-dvh font-sans antialiased ${
        lightMode ? "bg-[#F3F6F4] text-slate-900" : "bg-[#0b0f0d] text-slate-50"
      }`}
    >
      <Toast
        open={toastOpen && !!lastError}
        message={lastError ?? ""}
        tone={toastTone}
        onClose={() => setToastOpen(false)}
      />

      {/* ── page container ── */}
      <div className="mx-auto max-w-md px-4 pb-14 pt-5 space-y-4">

        {/* ══════════ HERO CARD ══════════ */}
        <div
          className={`relative overflow-hidden rounded-[28px] p-5 ring-1 shadow-lg ${
            lightMode
              ? "bg-gradient-to-br from-emerald-50 via-white to-white ring-emerald-100 shadow-emerald-100"
              : "bg-gradient-to-br from-emerald-600/20 via-[#0d1a11] to-[#0b0f0d] ring-emerald-700/30 shadow-emerald-900/40"
          }`}
        >
          {/* decorative blob */}
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, #22c55e, transparent 70%)" }}
          />

          {/* top row */}
          <div className="flex items-start justify-between gap-3">
            <BrandMark />
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-label="Mở cài đặt"
              className={`shrink-0 rounded-xl p-2 ring-1 transition active:scale-95 ${
                lightMode
                  ? "bg-slate-900 text-white ring-slate-900/20"
                  : "bg-white/10 text-white ring-white/15"
              }`}
            >
              <IconSettings className="h-4 w-4" />
            </button>
          </div>

          {/* headline */}
          <h1
            className={`mt-3 text-[22px] font-black leading-tight tracking-tight ${
              lightMode ? "text-slate-900" : "text-white"
            }`}
          >
            Đánh giá độ tươi
            <br />
            thực phẩm{" "}
            <span className="text-emerald-500">bằng QR sinh học</span>
          </h1>

          {/* feature pills */}
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { icon: "☀️", text: "Ánh sáng tự nhiên" },
              { icon: "📷", text: "Nhận diện màu AI" },
              { icon: "⚡", text: "Kết quả tức thì" },
            ].map((pill) => (
              <span
                key={pill.text}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${
                  lightMode
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                }`}
              >
                <span>{pill.icon}</span>
                {pill.text}
              </span>
            ))}
          </div>

          {/* settings drawer */}
          {settingsOpen && (
            <div
              className={`mt-4 rounded-2xl p-3.5 ring-1 ${
                lightMode
                  ? "bg-white text-slate-700 ring-slate-200"
                  : "bg-black/30 text-white ring-white/10"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={sectionLabel}>Tùy chỉnh nhanh</span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                    lightMode
                      ? "bg-slate-100 text-slate-600"
                      : "bg-white/10 text-white/70"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <IconX className="h-3.5 w-3.5" /> Đóng
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLightMode((v) => !v)}
                className={`mb-3 w-full rounded-xl px-3 py-2.5 text-xs font-semibold ring-1 active:scale-[0.99] ${
                  lightMode
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-900 ring-white/20"
                }`}
              >
                {lightMode ? "🌙 Chuyển sang chế độ tối" : "☀️ Chuyển sang chế độ sáng"}
              </button>
              <FeedbackSettings />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setInfoModal("bioInk")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${
                    lightMode
                      ? "bg-slate-100 text-slate-700 ring-slate-200"
                      : "bg-white/10 text-white ring-white/15"
                  }`}
                >
                  🧪 Cơ chế mực sinh học
                </button>
                <button
                  type="button"
                  onClick={() => setInfoModal("wrap")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ring-1 ${
                    lightMode
                      ? "bg-slate-100 text-slate-700 ring-slate-200"
                      : "bg-white/10 text-white ring-white/15"
                  }`}
                >
                  🍃 BioSmart Wrap
                </button>
              </div>
            </div>
          )}

          {/* CTA button */}
          <button
            type="button"
            onClick={() => {
              reset();
              setScannerOpen(true);
            }}
            aria-label="Mở camera để bắt đầu quét QR sinh học"
            className={`mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-base font-bold text-white shadow-lg active:scale-[0.98] transition-transform ${
              lightMode
                ? "bg-emerald-600 shadow-emerald-400/40 hover:bg-emerald-700"
                : "bg-emerald-500 shadow-emerald-500/30 hover:bg-emerald-400"
            }`}
            style={{
              boxShadow: lightMode
                ? "0 6px 24px #22c55e55"
                : "0 6px 28px #22c55e44",
            }}
          >
            <IconCamera className="h-5 w-5" />
            Bắt đầu quét
          </button>
        </div>

        {/* ══════════ RESULT SECTION ══════════ */}
        <div>
          <p className={`mb-2 ${sectionLabel}`}>Kết quả phân tích</p>

          {status === "idle" && history.length === 0 && (
            <div className={`rounded-3xl ${card}`}>
              <EmptyIllustration lightMode={lightMode} />
            </div>
          )}

          {status === "loading" && (
            <div
              className={`rounded-3xl p-5 ring-1 ${
                lightMode
                  ? "bg-white ring-slate-200"
                  : "bg-white/5 ring-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500" />
                </span>
                <span
                  className={`text-sm font-medium ${
                    lightMode ? "text-slate-700" : "text-white/80"
                  }`}
                >
                  Đang phân tích live…{" "}
                  {aiResult ? (
                    <span className="opacity-60">(đang cập nhật)</span>
                  ) : null}
                </span>
              </div>
            </div>
          )}

          {status === "error" && (
            <div
              className={`rounded-3xl p-4 ring-1 text-sm ${
                lightMode
                  ? "bg-rose-50 text-rose-800 ring-rose-200"
                  : "bg-rose-500/10 text-rose-100 ring-rose-500/20"
              }`}
            >
              {lastError ?? "Có lỗi. Vui lòng thử lại."}
              <button
                onClick={() => setToastOpen(true)}
                className={`mt-3 rounded-2xl px-3 py-2 text-xs font-semibold ring-1 active:scale-[0.99] ${
                  lightMode
                    ? "bg-white text-slate-700 ring-slate-200"
                    : "bg-white/10 text-white ring-white/10"
                }`}
              >
                Hiện thông báo
              </button>
              {aiResult && (
                <div className="mt-4">
                  <ResultCard lightMode={lightMode} />
                </div>
              )}
            </div>
          )}

          {status === "done" && (
            <ResultCard lightMode={lightMode} onViewProduct={handleOpenMetadata} />
          )}
        </div>

        {/* ══════════ SCAN HISTORY ══════════ */}
        <div>
          <p className={`mb-2 ${sectionLabel}`}>Lịch sử quét</p>
          <ScanHistory
            items={history}
            onClear={clearHistory}
            lightMode={lightMode}
          />
        </div>

        {/* ══════════ QR SHOWCASE GRID ══════════ */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className={sectionLabel}>4 mã QR BioSmart mẫu</p>
            <button
              onClick={() => window.print()}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 active:scale-[0.99] transition ${
                lightMode
                  ? "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                  : "bg-white/10 text-white ring-white/10 hover:bg-white/15"
              }`}
            >
              <IconPrint className="h-3.5 w-3.5" />
              In tất cả
            </button>
          </div>

          <div
            className={`mb-3 flex items-center gap-2 rounded-2xl px-3 py-2 ring-1 ${
              lightMode ? "bg-white ring-slate-200" : "bg-white/5 ring-white/10"
            }`}
          >
            {/* Full-range Anthocyanin gradient: purple → blue → teal/green → yellow */}
            <div
              className="h-2.5 flex-1 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #7c3aed, #818cf8, #60a5fa, #34d399, #fbbf24, #fde68a)",
              }}
            />
            <div className="flex gap-3 shrink-0">
              {["5.0", "6.5", "7.5", "8.5", "9.5"].map((v) => (
                <span
                  key={v}
                  className={`text-[10px] font-mono font-semibold ${
                    lightMode ? "text-slate-500" : "text-white/40"
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {qrShowcase.map((item) => (
              <QrCard key={item.id + item.label} item={item} lightMode={lightMode} />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ DIALOGS / OVERLAYS ══════════ */}

      <ProductMetadataDialog
        open={metadataQrId !== null}
        qrId={metadataQrId}
        lightMode={lightMode}
        onClose={() => setMetadataQrId(null)}
      />

      <Suspense
        fallback={
          <div className="fixed inset-0 z-[9998] grid place-items-center bg-slate-950/65 text-white">
            <div className="rounded-2xl bg-black/55 px-4 py-3 text-sm ring-1 ring-white/15">
              Đang tải camera quét…
            </div>
          </div>
        }
      >
        <QRScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          lightMode={lightMode}
          onViewProduct={handleOpenMetadata}
        />
      </Suspense>

      {infoModal && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl p-5 ring-1 ${
              lightMode
                ? "bg-white text-slate-900 ring-slate-200"
                : "bg-slate-900 text-white ring-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                  Tìm hiểu nhanh
                </div>
                <h3 className="mt-1 text-xl font-black">
                  {infoModal === "bioInk"
                    ? "Cơ chế mực sinh học"
                    : "Màng thực phẩm BioSmart Wrap"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModal(null)}
                className={`rounded-xl p-2 ring-1 ${
                  lightMode
                    ? "bg-slate-100 text-slate-600 ring-slate-200"
                    : "bg-white/10 text-white ring-white/10"
                }`}
                aria-label="Đóng thông tin"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <div
              className={`mt-4 space-y-3 text-sm leading-6 ${
                lightMode ? "text-slate-700" : "text-white/78"
              }`}
            >
              {infoModal === "bioInk" ? (
                <>
                  <p>
                    Mực sinh học đổi màu theo biến đổi hóa học trong thực phẩm.
                    Khi môi trường xung quanh thay đổi, màu trên mã sẽ dịch
                    chuyển để phản ánh mức độ tươi.
                  </p>
                  <p>
                    Cách này giúp người dùng nhìn nhanh bằng mắt thường, không
                    cần đọc thêm thông số kỹ thuật phức tạp.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Màng thực phẩm BioSmart Wrap được thiết kế để vừa bọc bảo
                    quản vừa mang lớp mã màu sinh học bên ngoài.
                  </p>
                  <p>
                    Nhờ đó, cùng một tấm màng có thể giữ thực phẩm và cung cấp
                    tín hiệu trực quan về tình trạng của sản phẩm.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ${
                lightMode
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-900 ring-white/15"
              }`}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}