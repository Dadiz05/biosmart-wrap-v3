import type { ScanRecord } from "../types";
import { formatScanDateTime } from "../utils/date";

function statusLabel(record: ScanRecord, lightMode: boolean): { label: string; cls: string } {
  if (record.status === "blocked") {
    return lightMode
      ? { label: "Không đọc được", cls: "bg-slate-200 text-slate-700 ring-slate-300" }
      : { label: "Không đọc được", cls: "bg-slate-700 text-slate-100 ring-slate-500/40" };
  }

  const map: Record<string, { label: string; cls: string }> = {
    fresh: { label: "Tươi", cls: lightMode ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-emerald-500/15 text-emerald-100 ring-emerald-400/30" },
    degraded: { label: "Giảm chất lượng", cls: lightMode ? "bg-amber-100 text-amber-800 ring-amber-200" : "bg-amber-500/15 text-amber-100 ring-amber-400/30" },
    spoiled: { label: "Ôi thiu", cls: lightMode ? "bg-lime-100 text-lime-800 ring-lime-200" : "bg-lime-500/15 text-lime-100 ring-lime-400/30" },
    critical: { label: "Hỏng nặng", cls: lightMode ? "bg-rose-100 text-rose-800 ring-rose-200" : "bg-rose-500/15 text-rose-100 ring-rose-400/30" },
  };

  return map[record.status] ?? (lightMode
    ? { label: record.status, cls: "bg-slate-100 text-slate-700 ring-slate-200" }
    : { label: record.status, cls: "bg-white/10 text-white ring-white/15" });
}

function badgeTone(status: ScanRecord["status"], lightMode: boolean) {
  if (status === "blocked") return lightMode ? "bg-slate-50" : "bg-slate-900/35";
  if (status === "fresh") return lightMode ? "bg-emerald-50" : "bg-emerald-500/8";
  if (status === "degraded") return lightMode ? "bg-amber-50" : "bg-amber-500/8";
  if (status === "spoiled") return lightMode ? "bg-lime-50" : "bg-lime-500/8";
  return lightMode ? "bg-rose-50" : "bg-rose-500/8";
}

export default function ScanHistory({
  items,
  onClear,
  lightMode = false,
}: {
  items: ScanRecord[];
  onClear: () => void;
  lightMode?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className={`rounded-3xl p-4 ring-1 text-sm ${lightMode ? "bg-white text-slate-600 ring-slate-200" : "bg-white/5 text-white/60 ring-white/10"}`}>
        Chưa có lần quét nào. Sau khi quét, lịch sử hiển thị tại đây (tối đa 30 mục).
      </div>
    );
  }

  return (
    <div className={`rounded-3xl ring-1 overflow-hidden ${lightMode ? "bg-white ring-slate-200" : "bg-white/5 ring-white/10"}`}>
      <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${lightMode ? "border-slate-200" : "border-white/10"}`}>
        <span className={`text-xs font-semibold ${lightMode ? "text-slate-600" : "text-white/70"}`}>Lịch sử quét</span>
        <button
          type="button"
          onClick={onClear}
          className={`text-[11px] font-semibold active:scale-[0.99] ${lightMode ? "text-slate-500 hover:text-slate-700" : "text-white/50 hover:text-white/80"}`}
        >
          Xóa lịch sử
        </button>
      </div>
      <ul className={`max-h-[min(360px,50vh)] overflow-y-auto divide-y ${lightMode ? "divide-slate-200" : "divide-white/10"}`}>
        {items.map((record) => {
          const badge = statusLabel(record, lightMode);
          const title = record.qrId ? `QR ${record.qrId}` : "Không đọc được QR";
          return (
            <li key={record.id} className={`px-4 py-3 text-sm ${badgeTone(record.status, lightMode)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className={`font-medium truncate ${lightMode ? "text-slate-800" : "text-white"}`}>{title}</div>
                  <div className={`mt-1 text-[11px] ${lightMode ? "text-slate-500" : "text-white/55"}`}>
                    Lần quét #{record.scanNo} • {formatScanDateTime(record.scannedAt)}
                  </div>
                  {record.aiResult ? (
                    <div className={`mt-1 space-y-1 text-[11px] ${lightMode ? "text-slate-600" : "text-white/65"}`}>
                      <div>
                        pH: <span className={lightMode ? "text-slate-900" : "text-white/90"}>{record.aiResult.ph.ph.toFixed(2)}</span>
                        <span className={lightMode ? "text-slate-400" : "text-white/40"}> • </span>
                        Confidence: <span className={lightMode ? "text-slate-900" : "text-white/90"}>{Math.round(record.aiResult.ph.confidence * 100)}%</span>
                      </div>
                      <div>
                        Phân tích patch: <span className={lightMode ? "text-slate-900" : "text-white/90"}>{Math.round(record.aiResult.patch.confidence * 100)}%</span>
                        <span className={lightMode ? "text-slate-400" : "text-white/40"}> • </span>
                        QR: <span className={lightMode ? "text-slate-900" : "text-white/90"}>{Math.round(record.aiResult.qr.confidence * 100)}%</span>
                      </div>
                    </div>
                  ) : null}
                  {record.reason ? (
                    <div className={`mt-1 text-[11px] ${lightMode ? "text-rose-700" : "text-rose-100/90"}`}>{record.reason}</div>
                  ) : null}
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${badge.cls}`}>
                  {badge.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
