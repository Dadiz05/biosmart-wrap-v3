import type { ScanRecord } from "../types";
import { formatScanDateTime } from "../utils/date";

type HistoryPoint = {
  record: ScanRecord;
  ph: number;
};

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

function toSortedHistoryPoints(items: ScanRecord[]): HistoryPoint[] {
  return items
    .filter((item) => item.aiResult)
    .map((item) => ({ record: item, ph: item.aiResult!.ph.ph }))
    .sort((a, b) => new Date(a.record.scannedAt).getTime() - new Date(b.record.scannedAt).getTime());
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsv(items: ScanRecord[]) {
  const header = ["scanNo", "qrId", "scannedAt", "status", "ph", "confidence", "patchConfidence", "qrConfidence", "reason"];
  const rows = items.map((record) => [
    String(record.scanNo),
    record.qrId ?? "",
    record.scannedAt,
    record.status,
    record.aiResult ? formatNumber(record.aiResult.ph.ph) : "",
    record.aiResult ? formatNumber(record.aiResult.ph.confidence) : "",
    record.aiResult ? formatNumber(record.aiResult.patch.confidence) : "",
    record.aiResult ? formatNumber(record.aiResult.qr.confidence) : "",
    record.reason ?? "",
  ].map(escapeCsv).join(","));

  return [header.join(","), ...rows].join("\n");
}

function buildJson(items: ScanRecord[]) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      count: items.length,
      items,
    },
    null,
    2
  );
}

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function copyIfAvailable(text: string) {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => {});
  }
}

function HistoryChart({ items, lightMode }: { items: ScanRecord[]; lightMode: boolean }) {
  const points = toSortedHistoryPoints(items);

  if (points.length < 2) {
    return (
      <div className={`rounded-2xl px-4 py-3 text-sm ring-1 ${lightMode ? "bg-slate-50 text-slate-600 ring-slate-200" : "bg-white/5 text-white/65 ring-white/10"}`}>
        Chưa đủ dữ liệu để vẽ biểu đồ. Hãy quét thêm vài lần để thấy xu hướng pH.
      </div>
    );
  }

  const width = 320;
  const height = 180;
  const paddingX = 20;
  const paddingY = 16;
  const minPh = 5;
  const maxPh = 9.8;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;
  const stepX = innerWidth / Math.max(points.length - 1, 1);

  const toY = (ph: number) => paddingY + innerHeight - ((ph - minPh) / (maxPh - minPh)) * innerHeight;
  const toX = (index: number) => paddingX + stepX * index;

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(2)} ${toY(point.ph).toFixed(2)}`)
    .join(" ");

  const average = points.reduce((sum, point) => sum + point.ph, 0) / points.length;
  const latest = points[points.length - 1];

  return (
    <div className={`rounded-3xl p-4 ring-1 ${lightMode ? "bg-white ring-slate-200" : "bg-white/5 ring-white/10"}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className={`text-xs font-semibold ${lightMode ? "text-slate-600" : "text-white/70"}`}>Xu hướng pH</div>
          <div className={`mt-1 text-sm font-semibold ${lightMode ? "text-slate-900" : "text-white"}`}>
            Trung bình {average.toFixed(2)} • Mới nhất {latest.ph.toFixed(2)}
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${lightMode ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-white/10 text-white/70 ring-white/10"}`}>
          {points.length} điểm
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible" role="img" aria-label="Biểu đồ xu hướng pH theo thời gian">
        <rect x="0" y="0" width={width} height={height} rx="18" fill="transparent" />
        {[5, 6, 7, 8, 9].map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke={lightMode ? "#cbd5e1" : "rgba(255,255,255,0.14)"} strokeWidth="1" strokeDasharray="4 4" />
              <text x={4} y={y + 4} fontSize="10" fill={lightMode ? "#64748b" : "rgba(255,255,255,0.55)"}>{tick}</text>
            </g>
          );
        })}
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = toX(index);
          const y = toY(point.ph);
          return <circle key={point.record.id} cx={x} cy={y} r="4.5" fill={point.record.status === "critical" ? "#ef4444" : "#10b981"} stroke={lightMode ? "#ffffff" : "#0f172a"} strokeWidth="2" />;
        })}
      </svg>
      <div className={`mt-2 text-[11px] ${lightMode ? "text-slate-500" : "text-white/55"}`}>
        Mốc cuối: {formatScanDateTime(latest.record.scannedAt)}
      </div>
    </div>
  );
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
  const hasItems = items.length > 0;
  const csv = buildCsv(items);
  const json = buildJson(items);
  const latest = items[0];
  const resultItems = items.filter((item) => item.aiResult);
  const averagePh = resultItems.length
    ? resultItems.reduce((sum, item) => sum + item.aiResult!.ph.ph, 0) / resultItems.length
    : null;

  return (
    <div className={`rounded-3xl ring-1 overflow-hidden ${lightMode ? "bg-white ring-slate-200" : "bg-white/5 ring-white/10"}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b ${lightMode ? "border-slate-200" : "border-white/10"}`}>
        <div>
          <span className={`text-xs font-semibold ${lightMode ? "text-slate-600" : "text-white/70"}`}>Lịch sử quét</span>
          {hasItems ? (
            <div className={`mt-1 text-[11px] ${lightMode ? "text-slate-500" : "text-white/55"}`}>
              {items.length} lần quét • {resultItems.length} lần có pH • {averagePh !== null ? `pH TB ${averagePh.toFixed(2)}` : "chưa có pH"}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasItems ? (
            <>
              <button
                type="button"
                onClick={() => downloadText("biosmart-wrap-history.csv", csv, "text/csv;charset=utf-8")}
                className={`rounded-xl px-3 py-2 text-[11px] font-semibold ring-1 active:scale-[0.99] ${lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/10"}`}
              >
                Tải CSV
              </button>
              <button
                type="button"
                onClick={() => downloadText("biosmart-wrap-history.json", json, "application/json;charset=utf-8")}
                className={`rounded-xl px-3 py-2 text-[11px] font-semibold ring-1 active:scale-[0.99] ${lightMode ? "bg-slate-100 text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/10"}`}
              >
                Tải JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  copyIfAvailable(csv);
                }}
                className={`rounded-xl px-3 py-2 text-[11px] font-semibold ring-1 active:scale-[0.99] ${lightMode ? "bg-white text-slate-700 ring-slate-200" : "bg-white/10 text-white ring-white/10"}`}
              >
                Copy CSV
              </button>
              <button
                type="button"
                onClick={onClear}
                className={`rounded-xl px-3 py-2 text-[11px] font-semibold active:scale-[0.99] ${lightMode ? "text-slate-500 hover:text-slate-700" : "text-white/50 hover:text-white/80"}`}
              >
                Xóa lịch sử
              </button>
            </>
          ) : null}
        </div>
      </div>

      {!hasItems ? (
        <div className={`p-4 text-sm ${lightMode ? "bg-white text-slate-600" : "bg-white/5 text-white/60"}`}>
          Chưa có lần quét nào. Sau khi quét, lịch sử hiển thị tại đây (tối đa 30 mục).
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <HistoryChart items={items} lightMode={lightMode} />

          <ul className={`max-h-[min(360px,50vh)] overflow-y-auto divide-y rounded-3xl ring-1 ${lightMode ? "divide-slate-200 bg-white ring-slate-200" : "divide-white/10 bg-white/5 ring-white/10"}`}>
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

          {latest?.aiResult ? (
            <div className={`rounded-2xl p-3 text-[11px] ring-1 ${lightMode ? "bg-slate-50 text-slate-600 ring-slate-200" : "bg-white/5 text-white/65 ring-white/10"}`}>
              Lần gần nhất: {latest.qrId ? `QR ${latest.qrId}` : "QR không đọc được"} • {latest.aiResult.ph.label} • {formatScanDateTime(latest.scannedAt)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
